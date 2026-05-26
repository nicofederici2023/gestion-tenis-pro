/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';

const PwaContext = createContext({});

export const usePwa = () => useContext(PwaContext);

const getInitialStandalone = () => {
  if (typeof window === 'undefined') return false;
  return !!(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
};

const getInitialIOS = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

export const PwaProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS] = useState(getInitialIOS());
  const [isStandalone, setIsStandalone] = useState(getInitialStandalone());
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Escuchar evento de instalación para navegadores Chromium
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Escuchar si la app se instala con éxito
    const handleAppInstalled = () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      setTimeout(() => setInstalled(false), 4000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return true;
    }
    return false;
  };

  return (
    <PwaContext.Provider value={{
      isInstallable,
      isIOS,
      isStandalone,
      installed,
      installApp
    }}>
      {children}
    </PwaContext.Provider>
  );
};
