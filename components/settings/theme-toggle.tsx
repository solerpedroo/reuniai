"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor="theme-toggle" className="text-sm font-medium">
          Modo escuro
        </Label>
        <p className="text-xs text-muted-foreground">
          Ajusta a aparência do app. A preferência fica salva neste navegador.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Sun size={16} className="text-muted-foreground" aria-hidden />
        <Switch
          id="theme-toggle"
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="Alternar modo escuro"
        />
        <Moon size={16} className="text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}
