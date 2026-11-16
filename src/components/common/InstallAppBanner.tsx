"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Verifica se o usuário já dispensou o banner
    const dismissed = localStorage.getItem("famfin-install-dismissed");
    if (dismissed === "true") return;

    // Captura o evento de prompt de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("famfin-install-dismissed", "true");
  }

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f1e3d] p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Instalar FamFin</div>
            <div className="text-xs text-white/70">Acesso rápido na tela inicial</div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white shrink-0"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-3">
            Instale o app para acesso rápido, funcionamento offline e notificações.
          </p>
          <Button
            onClick={handleInstall}
            className="w-full"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Instalar agora
          </Button>
        </div>
      </div>
    </div>
  );
}
