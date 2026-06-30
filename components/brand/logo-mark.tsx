import Image from "next/image";
import { BRAND_ASSETS, PRODUCT_NAME } from "@/lib/brand/config";
import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  size?: number;
};

/** Marca gráfica do ReuniAI (quadrado com gradiente azul). */
export function LogoMark({ className, size = 32 }: LogoMarkProps) {
  return (
    <Image
      src={BRAND_ASSETS.logoMark}
      alt={PRODUCT_NAME}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      priority
    />
  );
}
