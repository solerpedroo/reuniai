import { PageHeader } from "@/components/layout/page-header";
import { SpeakerMappingsHub } from "@/components/speakers/speaker-mappings-hub";
import { getSpeakerMappings } from "@/lib/speakers/mappings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function SpeakersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mappings = user ? await getSpeakerMappings(createAdminClient(), user.id) : [];

  return (
    <div>
      <PageHeader
        title="Speakers"
        description="Mapeie rótulos genéricos da transcrição para nomes reais — melhora resumos, atribuições e prep."
        meta="Qualidade"
      />
      <SpeakerMappingsHub initialMappings={mappings} />
    </div>
  );
}
