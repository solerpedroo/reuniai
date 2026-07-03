import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ImportRecordingForm } from "@/components/import/import-recording-form";
import { Button } from "@/components/ui/button";

export default function ImportarPage() {
  return (
    <div>
      <PageHeader
        title="Importar gravação"
        description="Envie áudio ou vídeo de reuniões gravadas fora do bot — transcrição Whisper e análise completa."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reunioes">Voltar às reuniões</Link>
          </Button>
        }
      />
      <ImportRecordingForm />
    </div>
  );
}
