"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCommandPalette } from "@/components/shell/command-palette";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { setOpen } = useCommandPalette();

  useEffect(() => {
    let pendingG = false;
    let gTimer: number | undefined;

    function resetG() {
      pendingG = false;
      if (gTimer) window.clearTimeout(gTimer);
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (typing) return;

      if (event.key.toLowerCase() === "g") {
        pendingG = true;
        if (gTimer) window.clearTimeout(gTimer);
        gTimer = window.setTimeout(resetG, 1000);
        return;
      }

      if (pendingG) {
        resetG();
        if (event.key.toLowerCase() === "h") {
          event.preventDefault();
          router.push("/");
        }
        if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          router.push("/reunioes");
        }
        if (event.key.toLowerCase() === "b") {
          event.preventDefault();
          router.push("/busca");
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      resetG();
    };
  }, [router, setOpen]);
}
