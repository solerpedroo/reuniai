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
          timezone: string;
          notification_prefs: Json;
          saved_views: Json;
          last_weekly_digest_at: string | null;
          last_tasks_due_reminder_at: string | null;
          last_review_queue_reminder_at: string | null;
          last_account_export_at: string | null;
          locale: string;
          default_analysis_template: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          auto_join_enabled?: boolean;
          retention_days?: number;
          onboarding_completed?: boolean;
          timezone?: string;
          notification_prefs?: Json;
          saved_views?: Json;
          last_weekly_digest_at?: string | null;
          last_tasks_due_reminder_at?: string | null;
          last_review_queue_reminder_at?: string | null;
          last_account_export_at?: string | null;
          locale?: string;
          default_analysis_template?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          auto_join_enabled?: boolean;
          retention_days?: number;
          onboarding_completed?: boolean;
          timezone?: string;
          notification_prefs?: Json;
          saved_views?: Json;
          last_weekly_digest_at?: string | null;
          last_tasks_due_reminder_at?: string | null;
          last_review_queue_reminder_at?: string | null;
          last_account_export_at?: string | null;
          locale?: string;
          default_analysis_template?: string;
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
          bot_session_started_at: string | null;
          ended_at: string | null;
          platform: Database["public"]["Enums"]["meeting_platform"];
          meeting_url: string | null;
          status: Database["public"]["Enums"]["meeting_status"];
          recall_bot_id: string | null;
          duration_ms: number | null;
          recording_path: string | null;
          error_message: string | null;
          transcript_source: Database["public"]["Enums"]["transcript_source"] | null;
          native_artifact_id: string | null;
          prefer_native_transcript: boolean;
          analysis_template: string | null;
          meeting_reviewed_at: string | null;
          review_snoozed_until: string | null;
          personal_notes: string | null;
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
          bot_session_started_at?: string | null;
          ended_at?: string | null;
          platform?: Database["public"]["Enums"]["meeting_platform"];
          meeting_url?: string | null;
          status?: Database["public"]["Enums"]["meeting_status"];
          recall_bot_id?: string | null;
          duration_ms?: number | null;
          recording_path?: string | null;
          error_message?: string | null;
          transcript_source?: Database["public"]["Enums"]["transcript_source"] | null;
          native_artifact_id?: string | null;
          prefer_native_transcript?: boolean;
          analysis_template?: string | null;
          meeting_reviewed_at?: string | null;
          review_snoozed_until?: string | null;
          personal_notes?: string | null;
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
          bot_session_started_at?: string | null;
          ended_at?: string | null;
          platform?: Database["public"]["Enums"]["meeting_platform"];
          meeting_url?: string | null;
          status?: Database["public"]["Enums"]["meeting_status"];
          recall_bot_id?: string | null;
          duration_ms?: number | null;
          recording_path?: string | null;
          error_message?: string | null;
          transcript_source?: Database["public"]["Enums"]["transcript_source"] | null;
          native_artifact_id?: string | null;
          prefer_native_transcript?: boolean;
          analysis_template?: string | null;
          meeting_reviewed_at?: string | null;
          review_snoozed_until?: string | null;
          personal_notes?: string | null;
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
      participant_notes: {
        Row: {
          id: string;
          user_id: string;
          participant_key: string;
          body: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          participant_key: string;
          body?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          participant_key?: string;
          body?: string;
          updated_at?: string;
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
          priority: Database["public"]["Enums"]["action_item_priority"];
          snoozed_until: string | null;
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
          priority?: Database["public"]["Enums"]["action_item_priority"];
          snoozed_until?: string | null;
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
          priority?: Database["public"]["Enums"]["action_item_priority"];
          snoozed_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analysis_templates: {
        Row: {
          id: string;
          user_id: string | null;
          slug: string;
          name: string;
          description: string | null;
          sections: Json;
          is_builtin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          slug: string;
          name: string;
          description?: string | null;
          sections?: Json;
          is_builtin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          slug?: string;
          name?: string;
          description?: string | null;
          sections?: Json;
          is_builtin?: boolean;
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
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_folders: {
        Row: {
          meeting_id: string;
          folder_id: string;
          created_at: string;
        };
        Insert: {
          meeting_id: string;
          folder_id: string;
          created_at?: string;
        };
        Update: {
          meeting_id?: string;
          folder_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_tags: {
        Row: {
          meeting_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          meeting_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          meeting_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_highlights: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          start_ms: number;
          end_ms: number | null;
          label: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          start_ms: number;
          end_ms?: number | null;
          label: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          start_ms?: number;
          end_ms?: number | null;
          label?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_live_decisions: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          text: string;
          captured_at_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          text: string;
          captured_at_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          text?: string;
          captured_at_ms?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      playbooks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          enabled: boolean;
          conditions: Json;
          actions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          enabled?: boolean;
          conditions?: Json;
          actions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          enabled?: boolean;
          conditions?: Json;
          actions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      playbook_runs: {
        Row: {
          id: string;
          playbook_id: string;
          meeting_id: string;
          status: string;
          log: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          playbook_id: string;
          meeting_id: string;
          status: string;
          log?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          playbook_id?: string;
          meeting_id?: string;
          status?: string;
          log?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_minutes: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          content_md: string;
          content_json: Json;
          generated_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          content_md: string;
          content_json?: Json;
          generated_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          content_md?: string;
          content_json?: Json;
          generated_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decision_outcome_events: {
        Row: {
          id: string;
          outcome_id: string;
          meeting_id: string | null;
          event_type: string;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outcome_id: string;
          meeting_id?: string | null;
          event_type: string;
          detail?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          outcome_id?: string;
          meeting_id?: string | null;
          event_type?: string;
          detail?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      decision_outcomes: {
        Row: {
          id: string;
          user_id: string;
          decision_key: string;
          decision_text: string;
          status: Database["public"]["Enums"]["decision_outcome_status"];
          first_meeting_id: string | null;
          last_meeting_id: string | null;
          suggested_status: Database["public"]["Enums"]["decision_outcome_status"] | null;
          suggested_at: string | null;
          suggested_meeting_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          decision_key: string;
          decision_text: string;
          status?: Database["public"]["Enums"]["decision_outcome_status"];
          first_meeting_id?: string | null;
          last_meeting_id?: string | null;
          suggested_status?: Database["public"]["Enums"]["decision_outcome_status"] | null;
          suggested_at?: string | null;
          suggested_meeting_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          decision_key?: string;
          decision_text?: string;
          status?: Database["public"]["Enums"]["decision_outcome_status"];
          first_meeting_id?: string | null;
          last_meeting_id?: string | null;
          suggested_status?: Database["public"]["Enums"]["decision_outcome_status"] | null;
          suggested_at?: string | null;
          suggested_meeting_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_clips: {
        Row: {
          id: string;
          user_id: string;
          meeting_id: string;
          highlight_id: string | null;
          token: string;
          caption: string;
          start_ms: number;
          end_ms: number | null;
          expires_at: string;
          revoked_at: string | null;
          redact_pii: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meeting_id: string;
          highlight_id?: string | null;
          token?: string;
          caption: string;
          start_ms: number;
          end_ms?: number | null;
          expires_at: string;
          revoked_at?: string | null;
          redact_pii?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meeting_id?: string;
          highlight_id?: string | null;
          token?: string;
          caption?: string;
          start_ms?: number;
          end_ms?: number | null;
          expires_at?: string;
          revoked_at?: string | null;
          redact_pii?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      participant_digests: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          recipient_email: string;
          subject: string;
          body: string;
          share_token_id: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          recipient_email: string;
          subject: string;
          body: string;
          share_token_id?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          recipient_email?: string;
          subject?: string;
          body?: string;
          share_token_id?: string | null;
          sent_at?: string;
        };
        Relationships: [];
      };
      user_tasks: {
        Row: {
          id: string;
          user_id: string;
          action_item_id: string | null;
          meeting_id: string | null;
          title: string;
          assignee: string | null;
          due_date: string | null;
          status: Database["public"]["Enums"]["action_item_status"];
          source: Database["public"]["Enums"]["action_item_source"];
          priority: Database["public"]["Enums"]["action_item_priority"];
          snoozed_until: string | null;
          hub_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_item_id?: string | null;
          meeting_id?: string | null;
          title: string;
          assignee?: string | null;
          due_date?: string | null;
          status?: Database["public"]["Enums"]["action_item_status"];
          source?: Database["public"]["Enums"]["action_item_source"];
          priority?: Database["public"]["Enums"]["action_item_priority"];
          snoozed_until?: string | null;
          hub_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_item_id?: string | null;
          meeting_id?: string | null;
          title?: string;
          assignee?: string | null;
          due_date?: string | null;
          status?: Database["public"]["Enums"]["action_item_status"];
          source?: Database["public"]["Enums"]["action_item_source"];
          priority?: Database["public"]["Enums"]["action_item_priority"];
          snoozed_until?: string | null;
          hub_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_sync_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: Database["public"]["Enums"]["task_sync_provider"];
          access_token_encrypted: string | null;
          refresh_token_encrypted: string | null;
          external_account_label: string | null;
          config: Json;
          enabled: boolean;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: Database["public"]["Enums"]["task_sync_provider"];
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          external_account_label?: string | null;
          config?: Json;
          enabled?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: Database["public"]["Enums"]["task_sync_provider"];
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          external_account_label?: string | null;
          config?: Json;
          enabled?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_sync_links: {
        Row: {
          id: string;
          action_item_id: string;
          user_id: string;
          provider: Database["public"]["Enums"]["task_sync_provider"];
          external_id: string;
          last_pushed_at: string | null;
          last_pulled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action_item_id: string;
          user_id: string;
          provider: Database["public"]["Enums"]["task_sync_provider"];
          external_id: string;
          last_pushed_at?: string | null;
          last_pulled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action_item_id?: string;
          user_id?: string;
          provider?: Database["public"]["Enums"]["task_sync_provider"];
          external_id?: string;
          last_pushed_at?: string | null;
          last_pulled_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      knowledge_entries: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          summary: string | null;
          body: string;
          source_meeting_ids: string[];
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          slug: string;
          summary?: string | null;
          body?: string;
          source_meeting_ids?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          slug?: string;
          summary?: string | null;
          body?: string;
          source_meeting_ids?: string[];
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      verbal_commitments: {
        Row: {
          id: string;
          user_id: string;
          meeting_id: string;
          text: string;
          direction: Database["public"]["Enums"]["commitment_direction"];
          status: Database["public"]["Enums"]["verbal_commitment_status"];
          counterparty: string | null;
          due_date: string | null;
          source_quote: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meeting_id: string;
          text: string;
          direction: Database["public"]["Enums"]["commitment_direction"];
          status?: Database["public"]["Enums"]["verbal_commitment_status"];
          counterparty?: string | null;
          due_date?: string | null;
          source_quote?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meeting_id?: string;
          text?: string;
          direction?: Database["public"]["Enums"]["commitment_direction"];
          status?: Database["public"]["Enums"]["verbal_commitment_status"];
          counterparty?: string | null;
          due_date?: string | null;
          source_quote?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      participant_relationships: {
        Row: {
          id: string;
          user_id: string;
          participant_key: string;
          relationship_type: string;
          talking_points: Json;
          open_loops: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          participant_key: string;
          relationship_type?: string;
          talking_points?: Json;
          open_loops?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          participant_key?: string;
          relationship_type?: string;
          talking_points?: Json;
          open_loops?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_weekly_intentions: {
        Row: {
          id: string;
          user_id: string;
          week_key: string;
          intention: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_key: string;
          intention?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_key?: string;
          intention?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_coach_reports: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          score: number;
          metrics: Json;
          suggestions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          score: number;
          metrics?: Json;
          suggestions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          score?: number;
          metrics?: Json;
          suggestions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversation_rehearsals: {
        Row: {
          id: string;
          user_id: string;
          participant_key: string | null;
          scenario: string;
          messages: Json;
          feedback: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          participant_key?: string | null;
          scenario: string;
          messages?: Json;
          feedback?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          participant_key?: string | null;
          scenario?: string;
          messages?: Json;
          feedback?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      speaker_mappings: {
        Row: {
          id: string;
          user_id: string;
          label_pattern: string;
          participant_email: string | null;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label_pattern: string;
          participant_email?: string | null;
          display_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label_pattern?: string;
          participant_email?: string | null;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      series_analysis_defaults: {
        Row: {
          user_id: string;
          calendar_recurring_event_id: string;
          analysis_template: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          calendar_recurring_event_id: string;
          analysis_template: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          calendar_recurring_event_id?: string;
          analysis_template?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      share_tokens: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          token: string;
          scope: Database["public"]["Enums"]["share_scope"];
          permissions: Json;
          expires_at: string;
          revoked_at: string | null;
          redact_pii: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          token?: string;
          scope?: Database["public"]["Enums"]["share_scope"];
          permissions?: Json;
          expires_at: string;
          revoked_at?: string | null;
          redact_pii?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          token?: string;
          scope?: Database["public"]["Enums"]["share_scope"];
          permissions?: Json;
          expires_at?: string;
          revoked_at?: string | null;
          redact_pii?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      export_audit: {
        Row: {
          id: string;
          user_id: string;
          meeting_id: string | null;
          share_token_id: string | null;
          format: string;
          redaction_count: number;
          redaction_types: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meeting_id?: string | null;
          share_token_id?: string | null;
          format: string;
          redaction_count?: number;
          redaction_types?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meeting_id?: string | null;
          share_token_id?: string | null;
          format?: string;
          redaction_count?: number;
          redaction_types?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      slack_connections: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          team_name: string | null;
          channel_id: string | null;
          channel_name: string | null;
          bot_token_encrypted: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          team_name?: string | null;
          channel_id?: string | null;
          channel_name?: string | null;
          bot_token_encrypted: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string;
          team_name?: string | null;
          channel_id?: string | null;
          channel_name?: string | null;
          bot_token_encrypted?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notion_connections: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          workspace_name: string | null;
          access_token_encrypted: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          workspace_name?: string | null;
          access_token_encrypted: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          workspace_name?: string | null;
          access_token_encrypted?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      outbound_webhooks: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          secret: string;
          events: string[];
          description: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          secret: string;
          events?: string[];
          description?: string | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          url?: string;
          secret?: string;
          events?: string[];
          description?: string | null;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_deliveries: {
        Row: {
          id: string;
          webhook_id: string;
          event: string;
          payload: Json;
          status: string;
          attempts: number;
          last_error: string | null;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event: string;
          payload: Json;
          status?: string;
          attempts?: number;
          last_error?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          event?: string;
          payload?: Json;
          status?: string;
          attempts?: number;
          last_error?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_comments: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          start_ms: number;
          end_ms: number | null;
          label: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          start_ms: number;
          end_ms?: number | null;
          label: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          start_ms?: number;
          end_ms?: number | null;
          label?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_follow_ups: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          subject: string;
          body: string;
          follow_up_done_at: string | null;
          sent_at: string | null;
          sent_to: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          subject: string;
          body: string;
          follow_up_done_at?: string | null;
          sent_at?: string | null;
          sent_to?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          subject?: string;
          body?: string;
          follow_up_done_at?: string | null;
          sent_at?: string | null;
          sent_to?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_prep_cards: {
        Row: {
          id: string;
          meeting_id: string;
          user_id: string;
          briefing: string;
          related_meeting_id: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          meeting_id: string;
          user_id: string;
          briefing: string;
          related_meeting_id?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          meeting_id?: string;
          user_id?: string;
          briefing?: string;
          related_meeting_id?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          href: string | null;
          kind: string | null;
          dedupe_key: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          href?: string | null;
          kind?: string | null;
          dedupe_key?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          href?: string | null;
          kind?: string | null;
          dedupe_key?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_transcript_embeddings: {
        Args: {
          query_embedding: string;
          match_count?: number;
        };
        Returns: {
          segment_id: string;
          meeting_id: string;
          start_ms: number;
          speaker_label: string;
          segment_text: string;
          meeting_title: string;
          started_at: string;
          similarity: number;
        }[];
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
      action_item_status: "open" | "done" | "cancelled" | "suggested";
      action_item_source: "ai" | "manual" | "live";
      action_item_priority: "low" | "medium" | "high";
      calendar_provider: "google" | "outlook";
      task_sync_provider: "todoist" | "google_tasks";
      transcript_source: "vexa" | "teams_native" | "meet_native" | "upload";
      chat_message_role: "user" | "assistant";
      share_scope: "summary_only" | "full_transcript";
      commitment_direction: "i_owe" | "they_owe" | "mutual";
      verbal_commitment_status: "pending" | "fulfilled" | "overdue" | "disputed";
      decision_outcome_status: "pending" | "in_progress" | "done" | "reversed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
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
