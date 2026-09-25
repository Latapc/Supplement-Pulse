import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  X,
  FileCode,
  Info
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { triggerHaptic } from '../utils/soundEffects';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSharedUrl, setCopiedSharedUrl] = useState(false);

  if (!isOpen) return null;

  // The public shared URL that external tools like PWABuilder can crawl without Google cookie check
  const sharedUrl = 'https://ais-pre-p3la4lr6wdctj7sor2qxpy-206831609121.asia-southeast1.run.app';
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : sharedUrl;

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyShared = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopiedSharedUrl(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedSharedUrl(false), 2000);
  };

  const handleDirectInstall = async () => {
    triggerHaptic('medium');
    await install();
  };

  const handleDownloadManifest = () => {
    triggerHaptic('light');
    const link = document.createElement('a');
    link.href = '/manifest.json';
    link.download = 'manifest.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#1a1714] border border-stone-300 dark:border-stone-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between bg-stone-100 dark:bg-[#231f1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black border border-stone-700 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
              <img src="/icon.svg" alt="App Icon" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-syne text-stone-900 dark:text-white flex items-center gap-2">
                Android APK & Mobile App
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  READY
                </span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                Install SuppleTrack directly on your Android phone or generate a .apk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto bg-white dark:bg-[#1a1714]">
          
          {/* Method 1: Instant Native Installation (TWA / WebAPK) */}
          <div className="p-5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold">
                  RECOMMENDED
                </span>
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  1-Tap Android WebAPK Installation
                </h3>
              </div>
            </div>

            <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
              Android automatically compiles SuppleTrack into a true native <strong>WebAPK</strong> on your phone with your new neon pill icon, splash screen, offline caching, and standalone window without browser address bars!
            </p>

            {isInstallable ? (
              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Tap Here to Install SuppleTrack on Android</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#25211e] border border-stone-300 dark:border-stone-700 space-y-2 text-xs text-stone-800 dark:text-stone-200">
                <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  How to install from Chrome on your phone:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-stone-700 dark:text-stone-300">
                  <li>Open this URL on Google Chrome on your Android mobile.</li>
                  <li>Tap the <strong>three dots (⋮)</strong> menu in the top-right.</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                  <li>Android will place the neon pill icon on your home screen immediately!</li>
                </ol>
              </div>
            )}
          </div>

          {/* Method 2: Convert to Standalone APK Package (PWABuilder / Bubblewrap) */}
          <div className="p-5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-[#231f1c] space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                METHOD 2
              </span>
              <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                Generate Standalone .apk Package (PWABuilder)
              </h3>
            </div>

            {/* Note regarding internal dev URL vs shared public URL */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Why PWABuilder showed "Missing Name":</p>
                <p className="text-[11px] leading-relaxed">
                  The dev preview link (<code>ais-dev-...</code>) is password-protected by Google Studio authentication. External bots like PWABuilder are blocked by Google's login check.
                  Use the <strong>Public Shared URL</strong> below which allows PWABuilder to read the manifest:
                </p>
              </div>
            </div>

            {/* Public Shared URL for PWABuilder */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                Public Shared URL for PWABuilder:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={sharedUrl}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 font-mono text-stone-900 dark:text-white font-medium"
                />
                <button
                  type="button"
                  onClick={handleCopyShared}
                  className="px-3 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 transition"
                >
                  {copiedSharedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSharedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`https://www.pwabuilder.com?url=${encodeURIComponent(sharedUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                <span>Launch PWABuilder</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleDownloadManifest}
                className="py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download manifest.json</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-stone-100 dark:bg-[#231f1c] border-t border-stone-200 dark:border-stone-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
