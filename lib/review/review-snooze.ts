export type ReviewSnoozePreset = "tomorrow" | "in_3_days";

export function reviewSnoozeUntilFromPreset(
  preset: ReviewSnoozePreset,
  now = new Date()
): string {
  const result = new Date(now);
  result.setHours(9, 0, 0, 0);

  if (preset === "tomorrow") {
    result.setDate(result.getDate() + 1);
  } else {
    result.setDate(result.getDate() + 3);
  }

  return result.toISOString();
}

export function isReviewSnoozed(
  reviewSnoozedUntil: string | null | undefined,
  now = new Date()
): boolean {
  return reviewSnoozedUntil != null && new Date(reviewSnoozedUntil) > now;
}
