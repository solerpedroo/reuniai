"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { MOTION, easePremium } from "@/components/motion/presets";
import { NAV_ITEMS } from "@/components/shell/nav-config";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: Icon;
  href?: string;
  action?: "search" | "join" | "busca";
  group: string;
};

const BASE_COMMANDS: CommandItem[] = [
  ...NAV_ITEMS.map((item) => ({
    id: item.href,
    label: item.label,
    description: item.description,
    icon: item.icon,
    href: item.href,
    group: "Navegação",
  })),
  {
    id: "busca",
    label: "Busca global",
    description: "Pesquisar título e transcrições",
    icon: MagnifyingGlass,
    href: "/busca",
    group: "Navegação",
  },
  {
    id: "new-meeting",
    label: "Nova reunião",
    description: "Colar link e enviar o bot",
    icon: Plus,
    action: "join",
    group: "Ações",
  },
];

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <CommandPaletteDialog />
    </CommandPaletteContext.Provider>
  );
}

function CommandPaletteDialog() {
  const router = useRouter();
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = BASE_COMMANDS.filter((item) => {
      if (!term) return true;
      return (
        item.label.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    });

    if (term) {
      filtered.push({
        id: `search-${term}`,
        label: `Buscar "${query.trim()}" em todas as reuniões`,
        description: "Abrir busca global",
        icon: MagnifyingGlass,
        action: "search",
        group: "Busca",
      });
    }

    return filtered;
  }, [query]);

  const runItem = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery("");
      setActiveIndex(0);

      if (item.action === "join") {
        router.push("/reunioes?join=1");
        return;
      }

      if (item.action === "search") {
        router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
        return;
      }

      if (item.href) {
        router.push(item.href);
      }
    },
    [router, query, setOpen]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }

      if (event.key === "Enter" && items[activeIndex]) {
        event.preventDefault();
        runItem(items[activeIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, activeIndex, runItem, setOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar paleta de comandos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION.duration.fast }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: MOTION.duration.base, ease: easePremium }}
            className="surface-modal fixed left-1/2 top-[18%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl"
          >
            <div className="border-b border-border/70 p-3">
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar páginas, ações ou reuniões…"
                  className="h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado para &ldquo;{query}&rdquo;
                </p>
              ) : (
                groups.map(([group, groupItems]) => (
                  <div key={group} className="mb-2 last:mb-0">
                    <p className="label-caps px-2 py-1.5">{group}</p>
                    <ul>
                      {groupItems.map((item) => {
                        const globalIndex = items.indexOf(item);
                        const Icon = item.icon;
                        const isActive = globalIndex === activeIndex;

                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => runItem(item)}
                              onMouseEnter={() => setActiveIndex(globalIndex)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                isActive
                                  ? "bg-brand/10 text-foreground"
                                  : "text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              <Icon
                                size={18}
                                className={cn(isActive ? "text-brand" : undefined)}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground">
                                  {item.label}
                                </span>
                                {item.description && (
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {item.description}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-2">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  ↑↓
                </kbd>
                navegar
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  ↵
                </kbd>
                abrir
              </span>
              <span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  esc
                </kbd>
                fechar
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function CommandTrigger({ className }: { className?: string }) {
  const { toggle } = useCommandPalette();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "hidden h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border/80 bg-background/60 px-3 text-left text-xs text-muted-foreground transition-colors hover:border-brand/25 hover:bg-background lg:flex",
        className
      )}
    >
      <MagnifyingGlass size={14} />
      <span className="flex-1">Buscar ou executar…</span>
      <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
        {isMac ? "⌘K" : "Ctrl+K"}
      </kbd>
    </button>
  );
}
