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
};
