export type CommandSearchHitType = "meeting" | "task" | "participant" | "action";

export type CommandSearchHit = {
  id: string;
  type: CommandSearchHitType;
  label: string;
  description?: string;
  href: string;
};

export type CommandSearchResponse = {
  results: CommandSearchHit[];
};
