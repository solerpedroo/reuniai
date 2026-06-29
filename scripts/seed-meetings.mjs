// Seed de reuniões mock para desenvolvimento.
// Uso: npm run db:seed  (carrega variáveis de .env.local via --env-file)
//
// Insere 5 reuniões + alguns action items para o PRIMEIRO usuário cadastrado.
// Requer SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hours = (h) => h * 3_600_000;
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000);
const daysAhead = (d) => new Date(Date.now() + d * 86_400_000);

async function main() {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const user = list.users[0];
  if (!user) {
    console.error("Nenhum usuário encontrado. Crie uma conta antes de rodar o seed.");
    process.exit(1);
  }
  console.log(`Semeando dados para: ${user.email} (${user.id})`);

  const startWeekly = daysAgo(3);
  startWeekly.setHours(14, 0, 0, 0);
  const startReview = daysAgo(7);
  startReview.setHours(10, 30, 0, 0);
  const startPlanning = daysAgo(12);
  startPlanning.setHours(9, 0, 0, 0);
  const startProcessing = daysAgo(0);
  startProcessing.setHours(11, 0, 0, 0);
  const startNext = daysAhead(1);
  startNext.setHours(15, 0, 0, 0);

  const meetings = [
    {
      user_id: user.id,
      title: "Weekly de Produto",
      started_at: startWeekly.toISOString(),
      ended_at: new Date(startWeekly.getTime() + hours(1)).toISOString(),
      duration_ms: hours(1),
      platform: "google_meet",
      status: "completed",
      meeting_url: "https://meet.google.com/abc-defg-hij",
    },
    {
      user_id: user.id,
      title: "Review de Sprint 24",
      started_at: startReview.toISOString(),
      ended_at: new Date(startReview.getTime() + hours(1.5)).toISOString(),
      duration_ms: hours(1.5),
      platform: "zoom",
      status: "completed",
      meeting_url: "https://zoom.us/j/123456789",
    },
    {
      user_id: user.id,
      title: "Planejamento Trimestral",
      started_at: startPlanning.toISOString(),
      ended_at: new Date(startPlanning.getTime() + hours(2)).toISOString(),
      duration_ms: hours(2),
      platform: "teams",
      status: "partial",
      meeting_url: "https://teams.microsoft.com/l/meetup-join/xyz",
    },
    {
      user_id: user.id,
      title: "1:1 com Liderança",
      started_at: startProcessing.toISOString(),
      platform: "google_meet",
      status: "processing",
      meeting_url: "https://meet.google.com/klm-nopq-rst",
    },
    {
      user_id: user.id,
      title: "Kickoff Cliente Acme",
      started_at: startNext.toISOString(),
      platform: "zoom",
      status: "scheduled",
      meeting_url: "https://zoom.us/j/987654321",
    },
  ];

  const { data: inserted, error: meetingsError } = await supabase
    .from("meetings")
    .insert(meetings)
    .select("id, title, status");

  if (meetingsError) throw meetingsError;
  console.log(`Inseridas ${inserted.length} reuniões.`);

  const completed = inserted.filter((m) => m.status === "completed" || m.status === "partial");
  const actionItems = completed.flatMap((m, i) => [
    {
      meeting_id: m.id,
      user_id: user.id,
      title: `Enviar follow-up de "${m.title}"`,
      assignee: user.email,
      due_date: daysAhead(i + 1).toISOString().slice(0, 10),
      status: "open",
      source: "ai",
    },
    {
      meeting_id: m.id,
      user_id: user.id,
      title: `Revisar decisões de "${m.title}"`,
      due_date: daysAgo(1).toISOString().slice(0, 10),
      status: "open",
      source: "ai",
    },
  ]);

  if (actionItems.length > 0) {
    const { error: aiError } = await supabase.from("action_items").insert(actionItems);
    if (aiError) throw aiError;
    console.log(`Inseridos ${actionItems.length} action items.`);
  }

  console.log("Seed concluído.");
}

main().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});
