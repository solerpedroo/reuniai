"use client";

import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { PRODUCT } from "@/lib/brand/config";
import { Button } from "@/components/ui/button";
import {
  isNavActive,
  NAV_ACCOUNT_ITEMS,
  NAV_PRIMARY_ITEMS,
  type NavItem,
} from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  pathname: string;
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  className?: string;
};

export function AppSidebar({
  pathname,
  onNavigate,
  showClose,
  onClose,
  className,
}: AppSidebarProps) {
  return (
    <div className={cn("sidebar-chrome flex h-full min-h-0 flex-col", className)}>
      <SidebarBrand onNavigate={onNavigate} showClose={showClose} onClose={onClose} />

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Menu principal">
        <SidebarNavSection
          label="Principal"
          items={NAV_PRIMARY_ITEMS}
          pathname={pathname}
          onNavigate={onNavigate}
        />

        <SidebarNavSection
          label="Conta"
          items={NAV_ACCOUNT_ITEMS}
          pathname={pathname}
          onNavigate={onNavigate}
          className="mt-5 border-t border-sidebar-border/80 pt-4"
        />
      </nav>

      <SidebarFooter />
    </div>
  );
}

function SidebarBrand({
  onNavigate,
  showClose,
  onClose,
}: {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
      <Link
        href="/"
        onClick={onNavigate}
        className="relative min-w-0 rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ReuniaiLogo />
      </Link>
      {showClose ? (
        <Button variant="ghost" size="icon" className="relative size-8" onClick={onClose} aria-label="Fechar menu">
          <X size={18} />
        </Button>
      ) : null}
    </div>
  );
}

function SidebarNavSection({
  label,
  items,
  pathname,
  onNavigate,
  className,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <section className={className} aria-label={label}>
      <div className="mb-2 flex items-center gap-2 px-2.5">
        <span className="h-px w-5 shrink-0 bg-brand/35" aria-hidden />
        <p className="sidebar-section-label">{label}</p>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            active={isNavActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </section>
  );
}

function SidebarNavItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-200",
          active
            ? "nav-active font-medium text-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        )}
      >
        <Icon
          size={18}
          weight={active ? "fill" : "regular"}
          className={cn(
            "shrink-0 transition-colors duration-200",
            active ? "text-brand" : "text-muted-foreground group-hover:text-brand/75"
          )}
          aria-hidden
        />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function SidebarFooter() {
  return (
    <div className="shrink-0 border-t border-sidebar-border px-5 py-4">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground/85">{PRODUCT.name}</span>
        {" · "}
        Gravação com consentimento dos participantes
      </p>
    </div>
  );
}
