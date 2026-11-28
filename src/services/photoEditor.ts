// Local photo editor. No network requests or external image services.
let queue: Promise<unknown> = Promise.resolve();
export function editPhoto(file: File): Promise<File> {
  const task = queue.then(() => openEditor(file));
  queue = task.catch(() => {});
  return task;
}
async function openEditor(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try { await img.decode(); } catch { URL.revokeObjectURL(url); return file; }
  return new Promise<File>((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.style.cssText = 'position:fixed;inset:0;margin:auto;width:min(100%,680px);max-width:100%;max-height:95dvh;padding:16px;background:#fffaf0;color:#174b35;border:2px solid #d6bb80;border-radius:20px;overflow:auto;z-index:99999';
    const heading = document.createElement('h2'); heading.textContent = 'Editar fotografía'; heading.style.cssText='font-size:22px;font-weight:800;margin-bottom:12px';
    const canvas = document.createElement('canvas');
    canvas.style.cssText='display:block;max-width:100%;max-height:42dvh;object-fit:contain;margin:auto;background:#eee;touch-action:none';
    const ctx = canvas.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
    const controls = document.createElement('div'); controls.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';
    const scale = Math.min(1, 1440 / Math.max(img.naturalWidth,img.naturalHeight));
    const initial = {rotation:0,flip:1,brightness:100,contrast:100,saturation:100,sepia:0,gray:0,ratio:0,zoom:1,frame:false,caption:'',sticker:'',color:'#ffffff'};
    let state = {...initial};
    const history: typeof state[] = [];
    const future: typeof state[] = [];
    let strokes: {x:number;y:number;end:boolean}[] = [];
    let drawing=false, pen=false;
    const render = () => {
      const angle=state.rotation*Math.PI/180;
      const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
      const rw=Math.abs(w*Math.cos(angle))+Math.abs(h*Math.sin(angle)),rh=Math.abs(w*Math.sin(angle))+Math.abs(h*Math.cos(angle));
      canvas.width=Math.max(1,Math.round(state.ratio?Math.min(rw,rh*state.ratio):rw));
      canvas.height=Math.max(1,Math.round(state.ratio?canvas.width/state.ratio:rh));
      const cw=canvas.width,ch=canvas.height;
      ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,cw,ch);
      ctx.save();ctx.translate(cw/2,ch/2);ctx.rotate(angle);ctx.scale(state.flip*state.zoom,state.zoom);
      ctx.filter='brightness('+state.brightness+'%) contrast('+state.contrast+'%) saturate('+state.saturation+'%) sepia('+state.sepia+'%) grayscale('+state.gray+'%)';
      ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
      ctx.strokeStyle=state.color;ctx.lineWidth=Math.max(3,cw/180);ctx.lineCap='round';ctx.beginPath();
      for(const p of strokes){if(p.end)ctx.moveTo(p.x*cw,p.y*ch);else ctx.lineTo(p.x*cw,p.y*ch);}ctx.stroke();
      if(state.frame){ctx.strokeStyle='#d6bb80';ctx.lineWidth=Math.max(8,cw*.035);ctx.strokeRect(0,0,cw,ch);}
      ctx.textAlign='center';ctx.fillStyle=state.color;ctx.strokeStyle='#174b35';ctx.lineWidth=2;
      ctx.font='bold '+Math.max(16,cw*.055)+'px sans-serif';ctx.strokeText(state.caption,cw/2,ch*.85,cw*.9);ctx.fillText(state.caption,cw/2,ch*.85,cw*.9);
      ctx.font=Math.max(24,cw*.12)+'px sans-serif';ctx.fillText(state.sticker,cw*.8,ch*.2);
    };
    const change=(patch:Partial<typeof state>)=>{history.push({...state});future.length=0;state={...state,...patch};render();};
    const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='min-height:44px;padding:8px 12px;border:1px solid #d6bb80;border-radius:12px;background:#174b35;color:white;font-weight:600';b.onclick=action;controls.append(b);return b;};
    button('Girar',()=>change({rotation:(state.rotation+90)%360}));button('Voltear',()=>change({flip:-state.flip}));
    for(const [label,ratio] of [['Original',0],['1:1',1],['4:5',.8],['9:16',9/16],['16:9',16/9]] as const)button(label,()=>change({ratio}));
    button('Cálido',()=>change({sepia:25,saturation:125,gray:0}));button('Vintage',()=>change({sepia:65,saturation:80,gray:0}));button('B/N',()=>change({gray:100,sepia:0}));button('Sin filtro',()=>change({gray:0,sepia:0,saturation:100,brightness:100,contrast:100}));
    for(const [label,key,min,max] of [['Brillo','brightness',50,150],['Contraste','contrast',50,150],['Saturación','saturation',0,200],['Zoom','zoom',1,2]] as const){
      const l=document.createElement('label');l.textContent=label+' ';l.style.cssText='display:grid;flex:1 1 120px;font-weight:600';
      const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step=key==='zoom'?'0.05':'1';input.value=String(state[key]);input.oninput=()=>change({[key]:Number(input.value)});l.append(input);controls.append(l);
    }
    const caption=document.createElement('input');caption.placeholder='Escribe un texto';caption.style.cssText='min-height:44px;font-size:16px;border:1px solid #d6bb80;border-radius:8px;padding:8px;max-width:100%';caption.oninput=()=>change({caption:caption.value});controls.append(caption);
    const color=document.createElement('input');color.type='color';color.value=state.color;color.setAttribute('aria-label','Color del texto y pincel');color.oninput=()=>change({color:color.value});controls.append(color);
    for(const emoji of ['💚','🌻','🎂','🧶','✨','❤️'])button(emoji,()=>change({sticker:emoji}));
    button('Marco dorado',()=>change({frame:!state.frame}));
    const drawButton=button('Dibujar',()=>{pen=!pen;drawButton.textContent=pen?'Terminar dibujo':'Dibujar';});
    const point=(e:PointerEvent,end:boolean)=>{const r=canvas.getBoundingClientRect();strokes.push({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,end});render();};
    canvas.onpointerdown=e=>{if(!pen)return;drawing=true;canvas.setPointerCapture(e.pointerId);point(e,true);};canvas.onpointermove=e=>{if(drawing)point(e,false);};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};
    button('Borrar dibujo',()=>{strokes=[];render();});
    button('Deshacer',()=>{const prev=history.pop();if(prev){future.push(state);state=prev;render();}});button('Rehacer',()=>{const next=future.pop();if(next){history.push(state);state=next;render();}});
    button('Restaurar',()=>{change(initial);strokes=[];caption.value='';render();});
    let finished=false;
    const finish=(result:File)=>{if(finished)return;finished=true;dialog.close();dialog.remove();URL.revokeObjectURL(url);resolve(result);};
    button('Usar original',()=>finish(file));
    const save=button('Guardar edición',()=>{save.disabled=true;canvas.toBlob(blob=>{if(blob)finish(new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'}));else save.disabled=false;},'image/jpeg',.86);});
    dialog.oncancel=e=>{e.preventDefault();finish(file);};
    dialog.append(heading,canvas,controls);document.body.append(dialog);render();dialog.showModal();
  });
}
