"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { getNavItem, NAV_ITEMS } from "@/components/shell/nav-config";
import { CommandPaletteProvider, CommandTrigger, MobileCommandTrigger } from "@/components/shell/command-palette";
import { UserMenu } from "@/components/shell/user-menu";
import { JoinMeetingDialog } from "@/components/meetings/join-meeting-dialog";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const current = getNavItem(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarBrand />
        <nav className="flex-1 px-3 py-4" aria-label="Menu principal">
          <p className="label-caps px-3 pb-3">Menu</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={isNavActive(pathname, item.href)} />
            ))}
          </ul>
        </nav>
        <div className="border-t border-sidebar-border px-4 py-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            ReuniAI · Gravação com consentimento dos participantes
          </p>
        </div>
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
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menu mobile"
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
          <ReuniaiLogo compact />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </Button>
        </div>
        <nav className="flex-1 p-3" aria-label="Menu principal">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isNavActive(pathname, item.href)}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[260px]">
        <header className="glass sticky top-0 z-30 border-b border-border/70">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <List size={20} />
            </Button>

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
              <p className="truncate text-xs text-muted-foreground">{current.description}</p>
            </div>

            <div className="hidden max-w-md flex-1 justify-end lg:flex">
              <CommandTrigger />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <MobileCommandTrigger />
              <JoinMeetingDialog triggerClassName="h-9 px-3.5 text-xs" />
              {userEmail && <UserMenu email={userEmail} />}
            </div>
          </div>
        </header>

        <PageTransition>
          <div className="flex-1 px-4 py-6 lg:px-8">{children}</div>
        </PageTransition>

        <footer className="mt-auto border-t border-border/70 px-4 py-4 lg:px-8">
          <p className="text-xs text-muted-foreground">ReuniAI · Inteligência de reuniões</p>
        </footer>
      </div>
    </div>
    </CommandPaletteProvider>
  );
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const className = cn(
    "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-200",
    active
      ? "nav-active font-medium text-foreground"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
  );
  const iconEl = (
    <Icon
      size={18}
      weight={active ? "fill" : "regular"}
      className={cn("transition-colors", active ? "text-brand" : "group-hover:text-brand/70")}
      aria-hidden
    />
  );

  return (
    <li>
      <Link href={item.href} onClick={onNavigate} className={className}>
        {iconEl}
        {item.label}
      </Link>
    </li>
  );
}

function SidebarBrand() {
  return (
    <div className="border-b border-sidebar-border px-5 py-5">
      <ReuniaiLogo />
    </div>
  );
}
