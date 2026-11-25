import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, WifiOff } from 'lucide-react';
import { BottomSheet } from '../shared/BottomSheet';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const isIos =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      Boolean((navigator as unknown as { standalone?: boolean }).standalone);
    setIsInstalled(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
    if (!deferredPrompt) return 'manual';
    await deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res.outcome === 'accepted') setDeferredPrompt(null);
    return res.outcome;
  };

  return {
    canPromptInstall: Boolean(deferredPrompt),
    isInstalled,
    isIos,
    isOffline,
    triggerInstall,
  };
}

export const OfflineNoticeBar: React.FC<{ isOffline: boolean }> = ({ isOffline }) => {
  if (!isOffline) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-ocean-600 px-3 py-1.5 text-xs font-bold text-white shadow">
      <WifiOff className="h-3.5 w-3.5 text-solar-300" />
      <span>Sin conexión — viendo recuerdos guardados localmente</span>
    </div>
  );
};

export const PwaInstallSheet: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { canPromptInstall, isInstalled, isIos, triggerInstall } = usePwaInstall();

  return (
    <BottomSheet open={open} title="Instalar Cuaderno Social de la Familia" onClose={onClose}>
      <div className="space-y-4">
        <div className="crochet-parchment flex items-center gap-3.5 rounded-2xl p-4">
          <img
            src="./icons/icon-192.png"
            alt="Icono Cuaderno Social de la Familia"
            className="h-14 w-14 rounded-2xl shadow-md"
          />
          <div>
            <p className="font-editorial text-lg font-bold text-forest-800">
              Cuaderno Social de la Familia
            </p>
            <p className="text-xs text-espresso-700">
              Instálala en tu teléfono como una app nativa sin pasar por tiendas.
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="rounded-2xl bg-brazil-50 p-4 text-center text-sm font-bold text-forest-700">
            ✅ ¡Ya tienes instalada Cuaderno Social de la Familia en tu dispositivo!
          </div>
        ) : canPromptInstall ? (
          <button
            type="button"
            onClick={async () => {
              await triggerInstall();
              onClose();
            }}
            className="crochet-green-3d btn-yarn-press flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white"
          >
            <Download className="h-4 w-4 text-solar-300" />
            Instalar ahora en mi dispositivo
          </button>
        ) : null}

        {/* iPhone / iPad Instructions */}
        <div className="rounded-2xl border border-cotton-300 bg-white/85 p-4 text-sm text-espresso-800">
          <p className="flex items-center gap-2 font-bold text-forest-800">
            <Smartphone className="h-4 w-4 text-brazil-500" />
            {isIos ? 'Instrucciones para tu iPhone / iPad' : 'Cómo añadir en iPhone (Safari)'}
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-espresso-700">
            <li>
              Abre <strong>Cuaderno Social de la Familia</strong> en <strong>Safari</strong>.
            </li>
            <li>
              Toca el botón <Share className="inline h-3.5 w-3.5 text-ocean-600" />{' '}
              <strong>Compartir</strong> en la barra inferior.
            </li>
            <li>
              Desliza hacia abajo y selecciona <strong>«Añadir a pantalla de inicio»</strong>.
            </li>
            <li>
              Toca <strong>Añadir</strong> — aparecerá el icono <strong>Cuaderno Social</strong>.
            </li>
          </ol>
        </div>

        {/* Android Instructions */}
        <div className="rounded-2xl border border-cotton-300 bg-white/85 p-4 text-sm text-espresso-800">
          <p className="font-bold text-forest-800">Cómo instalar en Android (Chrome)</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-espresso-700">
            <li>Toca el menú <strong>⋮</strong> arriba a la derecha en Chrome.</li>
            <li>Elige <strong>«Instalar aplicación»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.</li>
            <li>Confirma para abrirla a pantalla completa en modo app.</li>
          </ol>
        </div>
      </div>
    </BottomSheet>
  );
};
