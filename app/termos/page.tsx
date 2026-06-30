import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { PRODUCT_NAME } from "@/lib/brand/config";

export const metadata = {
  title: `Termos de Uso · ${PRODUCT_NAME}`,
  description: "Condições de uso da plataforma ReuniAI.",
};

export default function TermosPage() {
  return (
    <LegalDocumentShell
      title="Termos de Uso"
      description="Ao criar uma conta e utilizar o ReuniAI, você concorda com as condições abaixo."
      updatedAt="30 de junho de 2026"
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold">1. Aceitação</h2>
        <p className="text-muted-foreground">
          Estes Termos regulam o acesso e uso do {PRODUCT_NAME}. O cadastro implica ciência e
          concordância com esta documentação e com a Política de Privacidade.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">2. Uso do serviço</h2>
        <p className="text-muted-foreground">
          Você deve utilizar a plataforma de forma lícita, informando participantes quando uma
          reunião estiver sendo gravada e obtendo os consentimentos necessários conforme a
          legislação aplicável. É vedado usar o serviço para violar direitos de terceiros, gravar
          conteúdo sem autorização ou burlar limites técnicos do produto.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">3. Conta e responsabilidades</h2>
        <p className="text-muted-foreground">
          Você é responsável por manter a confidencialidade das credenciais de acesso e por todas as
          ações realizadas em sua conta, inclusive o envio de bots a reuniões e o compartilhamento
          de transcrições e resumos gerados.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">4. Conteúdo e propriedade intelectual</h2>
        <p className="text-muted-foreground">
          Você mantém a titularidade sobre o conteúdo das suas reuniões. Concede ao {PRODUCT_NAME}{" "}
          licença limitada para processar esse conteúdo exclusivamente na prestação do serviço
          contratado. A marca, software e interface do {PRODUCT_NAME} permanecem de propriedade de
          seus respectivos titulares.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">5. Inteligência artificial</h2>
        <p className="text-muted-foreground">
          Resumos, tópicos e action items são gerados automaticamente e podem conter imprecisões.
          Você deve revisar os resultados antes de tomar decisões com base neles. O {PRODUCT_NAME}{" "}
          não substitui aconselhamento jurídico, financeiro ou profissional especializado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">6. Disponibilidade e alterações</h2>
        <p className="text-muted-foreground">
          O serviço pode ser atualizado, suspenso ou descontinuado em parte, mediante aviso quando
          razoável. Podemos alterar estes Termos; mudanças relevantes serão comunicadas por meios
          adequados. O uso continuado após a atualização constitui aceitação.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">7. Limitação de responsabilidade</h2>
        <p className="text-muted-foreground">
          Na extensão permitida pela lei, o {PRODUCT_NAME} não se responsabiliza por danos indiretos,
          lucros cessantes ou perdas decorrentes de uso indevido da plataforma, indisponibilidade
          temporária ou conteúdo gerado por IA sem revisão humana.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">8. Encerramento</h2>
        <p className="text-muted-foreground">
          Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar o acesso em
          caso de violação destes Termos ou exigência legal, respeitados os prazos de retenção
          previstos na Política de Privacidade.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
