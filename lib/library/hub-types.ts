export type LibraryHubCard = {
  href: string;
  label: string;
  description: string;
  count: number;
};

export type LibraryHub = {
  cards: LibraryHubCard[];
};
