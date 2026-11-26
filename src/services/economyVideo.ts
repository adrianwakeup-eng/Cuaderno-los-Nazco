type VideoWithCapture = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

/** Produces a small copy while preserving the original video and its audio. */
export async function encodeEconomyVideo(blob: Blob): Promise<Blob | null> {
  const video = document.createElement('video') as VideoWithCapture;
  const capture = video.captureStream ?? video.mozCaptureStream;
  if (!capture || typeof MediaRecorder === 'undefined' || blob.size < 320_000) return null;
  const mimeType = ['video/mp4', 'video/webm;codecs=vp8,opus']
    .find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) return null;

  const url = URL.createObjectURL(blob);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let source: MediaStream | undefined;
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let frame = 0;
  let timeout = 0;

  try {
    if (!context) return null;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      timeout = window.setTimeout(reject, 8_000);
      video.onloadeddata = () => resolve();
      video.onerror = () => reject();
      video.src = url;
    });
    window.clearTimeout(timeout);
    if (!video.videoWidth || !video.videoHeight || !(video.duration > 0 && video.duration <= 45)) return null;

    const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2);
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2);
    source = capture.call(video);
    stream = canvas.captureStream(15);
    source.getAudioTracks().forEach((track) => stream!.addTrack(track));
    const encoder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 235_000, audioBitsPerSecond: 38_000 });
    recorder = encoder;
    const chunks: Blob[] = [];
    const draw = () => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frame = requestAnimationFrame(draw);
    };
    const result = await new Promise<Blob>((resolve, reject) => {
      timeout = window.setTimeout(reject, (video.duration + 10) * 1_000);
      encoder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      encoder.onerror = () => reject();
      encoder.onstop = () => resolve(new Blob(chunks, { type: encoder.mimeType || mimeType }));
      video.onended = () => { if (encoder.state !== 'inactive') encoder.stop(); };
      draw();
      encoder.start();
      void video.play().catch(reject);
    });
    return result.size && result.size < blob.size * .8 ? result : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
    cancelAnimationFrame(frame);
    video.pause();
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    source?.getTracks().forEach((track) => track.stop());
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
