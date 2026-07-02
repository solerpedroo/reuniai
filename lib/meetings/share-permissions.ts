import { z } from "zod";
import type { ShareScope } from "@/lib/workflow/types";

export const SharePermissionsSchema = z.object({
  executive_summary: z.boolean(),
  topics: z.boolean(),
  decisions: z.boolean(),
  action_items: z.boolean(),
  participants: z.boolean(),
  transcript: z.boolean(),
  talk_time: z.boolean(),
});

export type SharePermissions = z.infer<typeof SharePermissionsSchema>;

export const SHARE_PERMISSION_FIELDS: {
  key: keyof SharePermissions;
  label: string;
  description: string;
  requiresTranscript?: boolean;
}[] = [
  {
    key: "executive_summary",
    label: "Resumo executivo",
    description: "Síntese principal gerada pela IA",
  },
  {
    key: "topics",
    label: "Tópicos discutidos",
    description: "Assuntos e contexto de cada tema",
  },
  {
    key: "decisions",
    label: "Decisões",
    description: "O que foi acordado na reunião",
  },
  {
    key: "action_items",
    label: "Atribuições",
    description: "Tarefas e responsáveis",
  },
  {
    key: "participants",
    label: "Participantes",
    description: "Nomes (e e-mails, se houver) de quem esteve na call",
  },
  {
    key: "talk_time",
    label: "Tempo de fala",
    description: "Distribuição de fala por participante",
    requiresTranscript: true,
  },
  {
    key: "transcript",
    label: "Transcrição completa",
    description: "Texto integral com falas e timestamps",
  },
];

export const DEFAULT_SHARE_PERMISSIONS: SharePermissions = {
  executive_summary: true,
  topics: true,
  decisions: true,
  action_items: true,
  participants: false,
  transcript: false,
  talk_time: false,
};

export const SHARE_PERMISSION_PRESETS: Record<
  "minimal" | "standard" | "full",
  {
    label: string;
    description: string;
    permissions: SharePermissions;
    friendlyTitle: string;
    friendlySubtitle: string;
    recommended?: boolean;
  }
> = {
  minimal: {
    label: "Mínimo",
    friendlyTitle: "Só o essencial",
    friendlySubtitle: "Resumo da reunião e lista de tarefas",
    description: "Só resumo executivo e atribuições",
    permissions: {
      executive_summary: true,
      topics: false,
      decisions: false,
      action_items: true,
      participants: false,
      transcript: false,
      talk_time: false,
    },
  },
  standard: {
    label: "Padrão",
    friendlyTitle: "Resumo completo",
    friendlySubtitle: "Assuntos, decisões e tarefas — sem a transcrição",
    description: "Resumo completo sem transcrição",
    recommended: true,
    permissions: {
      executive_summary: true,
      topics: true,
      decisions: true,
      action_items: true,
      participants: false,
      transcript: false,
      talk_time: false,
    },
  },
  full: {
    label: "Tudo",
    friendlyTitle: "Tudo, com transcrição",
    friendlySubtitle: "Inclui quem falou o quê, palavra por palavra",
    description: "Todo o conteúdo disponível",
    permissions: {
      executive_summary: true,
      topics: true,
      decisions: true,
      action_items: true,
      participants: true,
      transcript: true,
      talk_time: true,
    },
  },
};

export const SHARE_PERMISSION_SIMPLE_LABELS: Record<keyof SharePermissions, string> = {
  executive_summary: "Resumo da reunião",
  topics: "Assuntos discutidos",
  decisions: "Decisões tomadas",
  action_items: "Tarefas e responsáveis",
  participants: "Quem participou",
  talk_time: "Quanto cada um falou",
  transcript: "Tudo que foi dito (transcrição)",
};

export function describeSharePreview(permissions: SharePermissions): string[] {
  const normalized = normalizeSharePermissions(permissions);
  return (Object.keys(SHARE_PERMISSION_SIMPLE_LABELS) as (keyof SharePermissions)[])
    .filter((key) => normalized[key])
    .map((key) => SHARE_PERMISSION_SIMPLE_LABELS[key]);
}

export function formatSharePermissionsSummaryFriendly(permissions: SharePermissions): string {
  const preset = (
    Object.entries(SHARE_PERMISSION_PRESETS) as [
      keyof typeof SHARE_PERMISSION_PRESETS,
      (typeof SHARE_PERMISSION_PRESETS)[keyof typeof SHARE_PERMISSION_PRESETS],
    ][]
  ).find(([, option]) =>
    SHARE_PERMISSION_FIELDS.every(({ key }) => permissions[key] === option.permissions[key])
  );

  if (preset) return preset[1].friendlyTitle;
  return formatSharePermissionsSummary(permissions);
}

export function parseSharePermissions(value: unknown): SharePermissions {
  const parsed = SharePermissionsSchema.safeParse(value);
  if (parsed.success) return normalizeSharePermissions(parsed.data);

  if (typeof value === "object" && value !== null) {
    return normalizeSharePermissions({
      ...DEFAULT_SHARE_PERMISSIONS,
      ...(value as Partial<SharePermissions>),
    });
  }

  return { ...DEFAULT_SHARE_PERMISSIONS };
}

export function normalizeSharePermissions(permissions: SharePermissions): SharePermissions {
  const next = { ...permissions };

  if (!next.transcript) {
    next.talk_time = false;
  }

  return next;
}

export function hasShareableContent(permissions: SharePermissions): boolean {
  const normalized = normalizeSharePermissions(permissions);
  return (
    normalized.executive_summary ||
    normalized.topics ||
    normalized.decisions ||
    normalized.action_items ||
    normalized.participants ||
    normalized.transcript
  );
}

export function permissionsFromScope(scope: ShareScope): SharePermissions {
  if (scope === "full_transcript") {
    return { ...SHARE_PERMISSION_PRESETS.full.permissions };
  }
  return { ...SHARE_PERMISSION_PRESETS.standard.permissions };
}

export function scopeFromPermissions(permissions: SharePermissions): ShareScope {
  return normalizeSharePermissions(permissions).transcript ? "full_transcript" : "summary_only";
}

export function formatSharePermissionsSummary(permissions: SharePermissions): string {
  const labels = SHARE_PERMISSION_FIELDS.filter(({ key }) => permissions[key]).map(
    ({ label }) => label
  );

  if (labels.length === 0) return "Nada selecionado";
  if (labels.length <= 2) return labels.join(" · ");
  return `${labels.length} seções`;
}
