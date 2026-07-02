"use client";

import { useEffect, useState } from "react";
import { DeviceMobile, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "reuniai-pwa-install-dismissed";

export function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setHidden(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (hidden || !deferred) return null;

  async function install() {
    await deferred?.prompt();
    await deferred?.userChoice;
    setHidden(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  return (
    <div className="surface-card mb-6 flex flex-col gap-3 border-brand/20 bg-brand/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <DeviceMobile size={22} className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <div>
          <p className="text-sm font-medium">Instalar ReuniAI no celular</p>
          <p className="text-xs text-muted-foreground">
            Acesse a agenda do dia com um toque, como app nativo.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => void install()}>
          Instalar
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Fechar">
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
