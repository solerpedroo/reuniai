import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

export type DashboardAction = {
  href: string;
  title: string;
  subtitle: string;
  icon: Icon;
};

export function DashboardActionQueue({ actions }: { actions: DashboardAction[] }) {
  if (actions.length === 0) return null;

  return (
    <section aria-label="Pendências">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Pendências
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={`${action.href}-${action.title}`}
              href={action.href}
              className="group inline-flex min-w-[min(100%,15rem)] flex-1 items-center gap-3 rounded-lg border border-border/70 bg-card/30 px-3 py-2.5 transition-colors hover:border-brand/25 hover:bg-card/60 sm:max-w-[18rem]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand/10">
                <Icon size={16} className="text-brand" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{action.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {action.subtitle}
                </span>
              </span>
              <ArrowRight
                size={14}
                className="shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
