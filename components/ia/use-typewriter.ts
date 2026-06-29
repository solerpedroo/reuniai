"use client";

import { useEffect, useState } from "react";

export function useTypewriter(text: string, enabled: boolean, speedMs = 14) {
  const [displayed, setDisplayed] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
      }
    }, speedMs);

    return () => window.clearInterval(interval);
  }, [text, enabled, speedMs]);

  return displayed;
}
