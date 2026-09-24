import React from 'react';
import { 
  Smartphone, 
  Download, 
  ExternalLink, 
  X, 
  Check, 
  ShieldCheck, 
  WifiOff, 
  Zap, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentOrigin)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                Android Mobile App & APK
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Ready
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Install as a native application on your Android mobile device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3 font-semibold">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                SuppleTrack is installed and running in standalone native application mode on this device!
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  Instant 1-Click Mobile Installation
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Installs directly to your Android launcher via Google Chrome WebAPK
                </p>
              </div>

              {isInstallable ? (
                <button
                  onClick={async () => {
                    await install();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition shrink-0 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Install App Now
                </button>
              ) : (
                <div className="text-xs text-stone-400 dark:text-stone-500 text-center sm:text-right">
                  Open menu (⋮) in Chrome & tap <strong>"Install App"</strong>
                </div>
              )}
            </div>
          )}

          {/* 2 Ways to Get APK / Android App */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              2 Ways to Install on your Android Phone
            </h4>

            {/* Option 1: Chrome WebAPK */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h5 className="font-bold text-sm text-stone-900 dark:text-white">
                  Direct Android Chrome Install (Recommended)
                </h5>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed pl-8">
                Google Chrome on Android automatically compiles PWAs with Web App Manifests into a real Android <strong>WebAPK</strong>.
                It appears directly in your Android App Drawer, supports notifications, starts instantly offline, and has no browser toolbar.
              </p>
              <div className="pl-8 pt-1 text-[11px] text-stone-500 space-y-1">
                <div>• Step 1: Open this web app in Google Chrome on your Android phone</div>
                <div>• Step 2: Tap the <strong>⋮ (three dots)</strong> menu at the top right of Chrome</div>
                <div>• Step 3: Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></div>
              </div>
            </div>

            {/* Option 2: PWABuilder Downloadable APK */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                  <h5 className="font-bold text-sm text-stone-900 dark:text-white">
                    Package as Standalone APK File
                  </h5>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  PWABuilder
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed pl-8">
                Want a standalone <code>.apk</code> file to sideload or share? We have configured the full PWA Manifest (icons, standalone display, maskable assets). You can package it into an APK with 1 click using Microsoft PWABuilder or Bubblewrap CLI.
              </p>
              <div className="pl-8 pt-1">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition"
                >
                  Generate APK on PWABuilder <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* App Capabilities Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-stone-900 dark:text-white">Offline Ready</div>
                <div className="text-stone-500">Service Worker cache</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-stone-900 dark:text-white">Full Screen UI</div>
                <div className="text-stone-500">No browser borders</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50/50 dark:bg-stone-900/40 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Vite PWA & Android WebAPK Standards Compliant
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
