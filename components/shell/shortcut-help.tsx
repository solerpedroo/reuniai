"use client";

import { useEffect } from "react";
import { Keyboard } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { MOTION, easePremium } from "@/components/motion/presets";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Abrir paleta de comandos" },
  { keys: ["?"], label: "Ver atalhos de teclado" },
  { keys: ["/"], label: "Buscar (abre paleta)" },
  { keys: ["G", "H"], label: "Ir para visão geral" },
  { keys: ["G", "R"], label: "Ir para reuniões" },
  { keys: ["G", "B"], label: "Ir para busca global" },
  { keys: ["Esc"], label: "Fechar diálogos" },
] as const;

export function ShortcutHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "?" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }
        event.preventDefault();
        onOpenChange(!open);
      }

      if (event.key === "Escape" && open) {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar atalhos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-label="Atalhos de teclado"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: MOTION.duration.base, ease: easePremium }}
            className="surface-modal fixed left-1/2 top-[20%] z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-xl"
          >
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <Keyboard size={18} className="text-brand" />
              <h2 className="text-sm font-semibold">Atalhos de teclado</h2>
            </div>

            <ul className="divide-y divide-border/60 p-2">
              {SHORTCUTS.map((shortcut) => (
                <li
                  key={shortcut.label}
                  className="flex items-center justify-between gap-4 px-2 py-2.5"
                >
                  <span className="text-sm text-muted-foreground">{shortcut.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ShortcutHelpTrigger({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[11px] text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      Pressione <kbd className="rounded border border-border px-1 font-mono">?</kbd> para atalhos
    </button>
  );
}
