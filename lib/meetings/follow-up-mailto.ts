export function buildFollowUpMailto(options: {
  subject: string;
  body: string;
  to: string[];
}): string {
  const params = new URLSearchParams();
  const recipients = options.to.filter(Boolean);

  if (recipients.length > 0) {
    params.set("to", recipients.join(","));
  }

  params.set("subject", options.subject);
  params.set("body", options.body);

  return `mailto:?${params.toString()}`;
}
