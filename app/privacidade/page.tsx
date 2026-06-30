import { LegalDocumentShell } from "@/components/legal/legal-document-shell";
import { PRODUCT_NAME } from "@/lib/brand/config";

export const metadata = {
  title: `Política de Privacidade · ${PRODUCT_NAME}`,
  description: "Como o ReuniAI trata dados pessoais e áudio de reuniões, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalDocumentShell
      title="Política de Privacidade"
      description="Esta política descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)."
      updatedAt="30 de junho de 2026"
    >
      <section className="space-y-3">
        <h2 className="text-base font-semibold">1. Quem somos</h2>
        <p className="text-muted-foreground">
          O {PRODUCT_NAME} é uma plataforma de produtividade que grava reuniões online (com
          consentimento dos participantes), gera transcrições, resumos e itens de ação com apoio de
          inteligência artificial. O controlador dos dados é o titular da conta que utiliza o
          serviço para suas reuniões.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">2. Dados que tratamos</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>Dados de cadastro: nome, e-mail, fuso horário e preferências de idioma.</li>
          <li>
            Dados de reunião: áudio gravado, transcrição, participantes identificados, resumos e
            metadados (data, plataforma, duração).
          </li>
          <li>Dados de uso: logs técnicos, configurações e integrações autorizadas por você.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">3. Finalidades e bases legais</h2>
        <p className="text-muted-foreground">
          Tratamos dados para executar o contrato de prestação do serviço, registrar e analisar
          reuniões a seu pedido, melhorar a qualidade do produto e cumprir obrigações legais. O
          tratamento de áudio de terceiros participantes da reunião depende do consentimento
          informado e da legitimidade do anfitrião que inicia a gravação.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">4. Compartilhamento</h2>
        <p className="text-muted-foreground">
          Podemos utilizar provedores de infraestrutura, autenticação, transcrição e modelos de IA
          estritamente necessários à operação do serviço, sempre com contratos e medidas de
          segurança adequadas. Não vendemos seus dados pessoais.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">5. Retenção e segurança</h2>
        <p className="text-muted-foreground">
          Os dados são mantidos pelo período configurado em sua conta (retenção padrão de 365 dias,
          quando aplicável) ou enquanto necessários para a finalidade do tratamento. Aplicamos
          controles de acesso, criptografia em trânsito e boas práticas de segurança da informação.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">6. Seus direitos (LGPD)</h2>
        <p className="text-muted-foreground">
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização,
          portabilidade, eliminação de dados desnecessários, informação sobre compartilhamentos e
          revogação de consentimento, nos canais disponíveis nas configurações da conta ou por
          contato com o suporte. Participantes de reuniões gravadas podem solicitar ao anfitrião a
          remoção do conteúdo correspondente.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">7. Contato</h2>
        <p className="text-muted-foreground">
          Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, utilize os canais de
          suporte indicados no aplicativo ou no site oficial do {PRODUCT_NAME}.
        </p>
      </section>
    </LegalDocumentShell>
  );
}
