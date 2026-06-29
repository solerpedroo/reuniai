export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          auto_join_enabled: boolean;
          retention_days: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          auto_join_enabled?: boolean;
          retention_days?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          auto_join_enabled?: boolean;
          retention_days?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: Database["public"]["Enums"]["calendar_provider"];
          email: string;
          refresh_token_encrypted: string;
          sync_token: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: Database["public"]["Enums"]["calendar_provider"];
          email: string;
          refresh_token_encrypted: string;
          sync_token?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: Database["public"]["Enums"]["calendar_provider"];
          email?: string;
          refresh_token_encrypted?: string;
          sync_token?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          id: string;
          user_id: string;
          calendar_event_id: string | null;
          calendar_recurring_event_id: string | null;
          title: string;
          started_at: string;
          ended_at: string | null;
          platform: Database["public"]["Enums"]["meeting_platform"];
          meeting_url: string | null;
          status: Database["public"]["Enums"]["meeting_status"];
          recall_bot_id: string | null;
          duration_ms: number | null;
          recording_path: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calendar_event_id?: string | null;
          calendar_recurring_event_id?: string | null;
          title: string;
          started_at: string;
          ended_at?: string | null;
          platform?: Database["public"]["Enums"]["meeting_platform"];
          meeting_url?: string | null;
          status?: Database["public"]["Enums"]["meeting_status"];
          recall_bot_id?: string | null;
          duration_ms?: number | null;
          recording_path?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calendar_event_id?: string | null;
          calendar_recurring_event_id?: string | null;
          title?: string;
          started_at?: string;
          ended_at?: string | null;
          platform?: Database["public"]["Enums"]["meeting_platform"];
          meeting_url?: string | null;
          status?: Database["public"]["Enums"]["meeting_status"];
          recall_bot_id?: string | null;
          duration_ms?: number | null;
          recording_path?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          meeting_id: string;
          name: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          name: string;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          name?: string;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transcript_segments: {
        Row: {
          id: string;
          meeting_id: string;
          start_ms: number;
          end_ms: number;
          speaker_label: string;
          text: string;
          sequence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          start_ms: number;
          end_ms: number;
          speaker_label: string;
          text: string;
          sequence: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          start_ms?: number;
          end_ms?: number;
          speaker_label?: string;
          text?: string;
          sequence?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_summaries: {
        Row: {
          id: string;
          meeting_id: string;
          executive_summary: string | null;
          topics: Json;
          decisions: Json;
          raw_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          executive_summary?: string | null;
          topics?: Json;
          decisions?: Json;
          raw_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          executive_summary?: string | null;
          topics?: Json;
          decisions?: Json;
          raw_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      action_items: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          title: string;
          assignee: string | null;
          due_date: string | null;
          status: Database["public"]["Enums"]["action_item_status"];
          source: Database["public"]["Enums"]["action_item_source"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          title: string;
          assignee?: string | null;
          due_date?: string | null;
          status?: Database["public"]["Enums"]["action_item_status"];
          source?: Database["public"]["Enums"]["action_item_source"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          title?: string;
          assignee?: string | null;
          due_date?: string | null;
          status?: Database["public"]["Enums"]["action_item_status"];
          source?: Database["public"]["Enums"]["action_item_source"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["chat_message_role"];
          content: string;
          citations: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["chat_message_role"];
          content: string;
          citations?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["chat_message_role"];
          content?: string;
          citations?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      transcript_embeddings: {
        Row: {
          id: string;
          segment_id: string;
          meeting_id: string;
          embedding: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          segment_id: string;
          meeting_id: string;
          embedding: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          segment_id?: string;
          meeting_id?: string;
          embedding?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_id: string;
          payload: Json;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          event_id: string;
          payload: Json;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          event_id?: string;
          payload?: Json;
          processed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_meeting_owner: {
        Args: { meeting_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      meeting_platform: "google_meet" | "zoom" | "teams" | "other";
      meeting_status:
        | "scheduled"
        | "bot_joining"
        | "recording"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "partial";
      action_item_status: "open" | "done" | "cancelled";
      action_item_source: "ai" | "manual";
      calendar_provider: "google" | "outlook";
      chat_message_role: "user" | "assistant";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
