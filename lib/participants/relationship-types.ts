export type ParticipantRelationship = {
  participant_key: string;
  relationship_type: string;
  talking_points: string[];
  open_loops: string[];
  updated_at: string;
};

export const RELATIONSHIP_TYPES = [
  { value: "colega", label: "Colega" },
  { value: "gestor", label: "Gestor" },
  { value: "cliente", label: "Cliente" },
  { value: "parceiro", label: "Parceiro" },
  { value: "investidor", label: "Investidor" },
  { value: "candidato", label: "Candidato" },
  { value: "outro", label: "Outro" },
] as const;
