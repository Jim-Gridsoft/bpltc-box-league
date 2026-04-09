import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    // Detect iOS Safari
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode =
      "standalone" in navigator && (navigator as { standalone?: boolean }).standalone;

    if (isIos && !isInStandaloneMode) {
      setShowIosBanner(true);
      return;
    }

    // Android / Chrome — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroidBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowAndroidBanner(false);
    setShowIosBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (dismissed) return null;

  if (showAndroidBanner) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 shadow-lg"
        style={{ background: "#1b4332", color: "#faf6ee" }}
      >
        <div className="flex items-center gap-3">
          <img src="/icons/icon-72x72.png" alt="BPLTC" className="w-10 h-10 rounded-lg" />
          <div>
            <p className="font-semibold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Install BPLTC Box League
            </p>
            <p className="text-xs opacity-75">Add to your home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold"
            style={{ background: "#c9a84c", color: "#1b4332" }}
          >
            <Download size={14} />
            Install
          </button>
          <button onClick={handleDismiss} className="p-1.5 opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (showIosBanner) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 shadow-lg"
        style={{ background: "#1b4332", color: "#faf6ee" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <img src="/icons/icon-72x72.png" alt="BPLTC" className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Install BPLTC Box League
              </p>
              <p className="text-xs opacity-80 leading-relaxed">
                Tap <Share size={11} className="inline mx-0.5" /> <strong>Share</strong> then{" "}
                <strong>"Add to Home Screen"</strong> to install the app on your iPhone.
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1.5 opacity-60 hover:opacity-100 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
