import { useEffect, useState } from "react";

/** Evita hydration mismatch em primitives que geram ids no cliente (ex.: Radix). */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
