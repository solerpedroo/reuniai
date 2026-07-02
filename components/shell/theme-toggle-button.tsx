"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";
import { useMounted } from "@/lib/hooks/use-mounted";

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useMounted();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={mounted ? (isDark ? "Ativar modo claro" : "Ativar modo escuro") : "Alternar tema"}
      title={mounted ? (isDark ? "Modo claro" : "Modo escuro") : "Tema"}
      className="text-muted-foreground hover:text-foreground"
    >
      {mounted && isDark ? (
        <Sun size={18} weight="duotone" aria-hidden />
      ) : (
        <Moon size={18} weight="duotone" aria-hidden />
      )}
    </Button>
  );
}
