import { cn } from "@/lib/utils";

type LogoWordmarkProps = {
  className?: string;
  /** Texto claro sobre fundos escuros (auth inverse). */
  inverse?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-[15px]",
  lg: "text-xl",
} as const;

/** Logotipo tipográfico: Reuni (escuro) + AI (brand). */
export function LogoWordmark({ className, inverse = false, size = "md" }: LogoWordmarkProps) {
  return (
    <span className={cn("font-semibold tracking-tight", SIZE_CLASSES[size], className)}>
      <span className={inverse ? "text-white" : "text-foreground"}>Reuni</span>
      <span className={inverse ? "text-sky-300" : "text-brand"}>AI</span>
    </span>
  );
}
