/** MIME de áudio a partir da extensão do arquivo (imports e paths no Storage). */
export function contentTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "mp3":
    case "mpga":
    case "mpeg":
      return "audio/mpeg";
    case "mp4":
    case "m4a":
      return "audio/mp4";
    case "ogg":
      return "audio/ogg";
    case "webm":
      return "audio/webm";
    case "wav":
    default:
      return "audio/wav";
  }
}
