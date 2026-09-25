import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Check } from 'lucide-react';
import { triggerHaptic } from '../utils/soundEffects';

interface PWAInstallButtonProps {
  onOpenAndroidModal?: () => void;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenAndroidModal,
  className = '',
}) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setJustInstalled(true);
      }
    } else if (onOpenAndroidModal) {
      onOpenAndroidModal();
    }
  };

  return (
    <button
      onClick={handleInstallClick}
      title="Install SuppleTrack on Android / Mobile"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm hover:shadow-md transition active:scale-95 ${className}`}
    >
      <Smartphone className="w-3.5 h-3.5" />
      <span>{justInstalled ? 'Installed ✓' : isAndroid ? 'Install on Android' : 'Install App'}</span>
    </button>
  );
};
