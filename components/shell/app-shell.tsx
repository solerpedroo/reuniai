"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { getNavItem } from "@/components/shell/nav-config";
import {
  CommandPaletteProvider,
  CommandTrigger,
  CommandTriggerIcon,
} from "@/components/shell/command-palette";
import { AssistantFab } from "@/components/shell/assistant-fab";
import { NotificationBell } from "@/components/shell/notification-bell";
import { ThemeToggleButton } from "@/components/shell/theme-toggle-button";
import { UserMenu } from "@/components/shell/user-menu";
import { PRODUCT_TAGLINE } from "@/lib/brand/config";
import { cn } from "@/lib/utils";

type SessionUser = { name?: string | null; email?: string | null };

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: SessionUser;
}) {
  const pathname = usePathname();
  const current = getNavItem(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <CommandPaletteProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-sidebar-border lg:block">
          <AppSidebar pathname={pathname} />
        </aside>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
          )}
        </AnimatePresence>

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(280px,88vw)] border-r border-sidebar-border shadow-2xl transition-transform duration-300 ease-out lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-label="Menu mobile"
        >
          <AppSidebar
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            showClose
            onClose={() => setMobileOpen(false)}
          />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-[260px]">
          <header className="glass sticky top-0 z-30 border-b border-border/70 pt-[env(safe-area-inset-top,0px)]">
            <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 lg:px-8">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <List size={20} />
              </Button>

              <div className="hidden min-w-0 flex-1 lg:flex">
                <CommandTrigger className="max-w-md" />
              </div>

              <div className="min-w-0 flex-1 lg:hidden">
                <motion.p
                  key={current.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="truncate text-sm font-semibold"
                >
                  {current.label}
                </motion.p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {current.description}
                </p>
              </div>

              <CommandTriggerIcon />

              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <ThemeToggleButton />
                <NotificationBell />
                <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
                <UserMenu name={user?.name} email={user?.email} />
              </div>
            </div>
          </header>

          <PageTransition>
            <div id="main-content" className="flex-1 px-3 py-4 pb-fab sm:px-4 sm:py-6 lg:px-8">
              {children}
            </div>
          </PageTransition>

          <footer className="mt-auto border-t border-border/70 px-3 py-4 pr-16 sm:px-4 lg:px-8 lg:pr-8">
            <p className="text-xs text-muted-foreground">ReuniAI · {PRODUCT_TAGLINE}</p>
          </footer>
        </div>
      </div>
      <AssistantFab />
    </CommandPaletteProvider>
  );
}
