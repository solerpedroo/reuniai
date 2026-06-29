"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast toast-glass group-[.toaster]:text-foreground rounded-xl shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-brand group-[.toast]:text-brand-foreground group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          success: "group-[.toaster]:border-brand/30",
          error: "group-[.toaster]:border-destructive/35",
          warning: "group-[.toaster]:border-amber-500/35",
          info: "group-[.toaster]:border-brand/25",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
