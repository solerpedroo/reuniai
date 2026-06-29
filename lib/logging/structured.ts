type LogLevel = "info" | "warn" | "error";

type StructuredLog = {
  level: LogLevel;
  event: string;
  timestamp: string;
  [key: string]: unknown;
};

export function logStructured(
  level: LogLevel,
  event: string,
  data: Record<string, unknown> = {}
): void {
  const entry: StructuredLog = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}
