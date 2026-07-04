"use client";

import { useEffect, useState } from "react";

/** Contagem regressiva em ms até um instante ISO. Null se alvo ausente. */
export function useCountdownTo(isoTarget: string | null | undefined): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!isoTarget) {
      setRemainingMs(null);
      return;
    }

    const target = isoTarget;

    function tick() {
      setRemainingMs(Math.max(0, new Date(target).getTime() - Date.now()));
    }

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isoTarget]);

  return remainingMs;
}
