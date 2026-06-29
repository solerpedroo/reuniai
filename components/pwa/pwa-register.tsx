"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Falha ao registrar service worker:", err);
    });
  }, []);

  return null;
}
