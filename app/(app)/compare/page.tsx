import { Suspense } from "react";
import ComparePage from "./compare-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando comparação…</p>}>
      <ComparePage />
    </Suspense>
  );
}
