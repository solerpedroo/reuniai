import { Record, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Aviso de gravação · ReuniAI",
};

export default function RecordingNoticePage() {
  const botName = process.env.NEXT_PUBLIC_BOT_NAME ?? "ReuniAI Bot";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Record size={22} weight="fill" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Esta reunião está sendo gravada</h1>
      </div>

      <p className="mt-5 text-muted-foreground">
        O participante <strong className="text-foreground">{botName}</strong> é um assistente
        automatizado que entrou nesta chamada para gravar o áudio, gerar a transcrição e produzir
        um resumo com itens de ação para o anfitrião.
      </p>

      <div className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand" />
          <div className="text-sm">
            <p className="font-medium">Seus direitos (LGPD)</p>
            <p className="mt-1 text-muted-foreground">
              O tratamento dos dados é feito para a finalidade de registro e produtividade da
              reunião. Você pode solicitar ao anfitrião a remoção da gravação e da transcrição a
              qualquer momento. Se não desejar ser gravado, informe o anfitrião para que o bot seja
              removido da chamada.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Gravação operada via ReuniAI. Os dados ficam acessíveis apenas ao anfitrião da reunião.
      </p>
    </main>
  );
}
