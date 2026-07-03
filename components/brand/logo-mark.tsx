import { ReuniaiMarkIcon } from "@/components/brand/reuniai-mark-icon";
import { PRODUCT_NAME } from "@/lib/brand/config";
import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  size?: number;
  fillCutouts?: boolean;
};

/** Marca gráfica do ReuniAI — balão com robô (SVG, fundo transparente). */
export function LogoMark({ className, size = 32, fillCutouts = false }: LogoMarkProps) {
  return (
    <ReuniaiMarkIcon
      size={size}
      title={PRODUCT_NAME}
      fillCutouts={fillCutouts}
      className={cn("shrink-0", className)}
    />
  );
}
