export type MeetingSessionStatus = {
  connected: boolean;
  vexaStatus: string | null;
  transcription: {
    enabled: boolean;
    active: boolean;
    segmentCount: number;
  };
  recording: {
    enabled: boolean;
    capturing: boolean;
    available: boolean;
  };
  participants: {
    /** Humanos na call (exclui o bot). Null se indisponível. */
    humanCount: number | null;
    /** ISO — quando o bot sairá se a sala continuar vazia. */
    autoLeaveAt: string | null;
  };
};
