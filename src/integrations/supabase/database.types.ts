export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      sba_answering_setup_changes: {
        Row: {
          affected_paths: Json
          applied_at: string | null
          base_revision: number
          conflicts: Json
          created_at: string
          created_by_user_id: string | null
          id: string
          next_revision: number | null
          patch: Json
          requires_confirmation: boolean
          risk_level: string
          setup_id: string
          source: Database["public"]["Enums"]["sba_change_source"]
          status: Database["public"]["Enums"]["sba_change_status"]
          summary: string
          user_instruction: string | null
        }
        Insert: {
          affected_paths?: Json
          applied_at?: string | null
          base_revision: number
          conflicts?: Json
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          next_revision?: number | null
          patch: Json
          requires_confirmation?: boolean
          risk_level: string
          setup_id: string
          source: Database["public"]["Enums"]["sba_change_source"]
          status?: Database["public"]["Enums"]["sba_change_status"]
          summary: string
          user_instruction?: string | null
        }
        Update: {
          affected_paths?: Json
          applied_at?: string | null
          base_revision?: number
          conflicts?: Json
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          next_revision?: number | null
          patch?: Json
          requires_confirmation?: boolean
          risk_level?: string
          setup_id?: string
          source?: Database["public"]["Enums"]["sba_change_source"]
          status?: Database["public"]["Enums"]["sba_change_status"]
          summary?: string
          user_instruction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sba_answering_setup_changes_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_answering_setup_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by_user_id: string | null
          document: Json
          field_metadata: Json
          id: string
          revision: number
          schema_version: string
          setup_id: string
          source: Database["public"]["Enums"]["sba_change_source"]
          version_kind: string
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by_user_id?: string | null
          document: Json
          field_metadata?: Json
          id?: string
          revision: number
          schema_version: string
          setup_id: string
          source: Database["public"]["Enums"]["sba_change_source"]
          version_kind?: string
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by_user_id?: string | null
          document?: Json
          field_metadata?: Json
          id?: string
          revision?: number
          schema_version?: string
          setup_id?: string
          source?: Database["public"]["Enums"]["sba_change_source"]
          version_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_answering_setup_versions_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_answering_setups: {
        Row: {
          business_id: string
          created_at: string
          draft_document: Json
          draft_field_metadata: Json
          draft_revision: number
          id: string
          is_live: boolean
          is_paused: boolean
          last_published_at: string | null
          last_tested_at: string | null
          live_revision: number
          live_version_id: string | null
          needs_review: boolean
          schema_version: string
          status_mode: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          draft_document: Json
          draft_field_metadata?: Json
          draft_revision?: number
          id?: string
          is_live?: boolean
          is_paused?: boolean
          last_published_at?: string | null
          last_tested_at?: string | null
          live_revision?: number
          live_version_id?: string | null
          needs_review?: boolean
          schema_version?: string
          status_mode?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          draft_document?: Json
          draft_field_metadata?: Json
          draft_revision?: number
          id?: string
          is_live?: boolean
          is_paused?: boolean
          last_published_at?: string | null
          last_tested_at?: string | null
          live_revision?: number
          live_version_id?: string | null
          needs_review?: boolean
          schema_version?: string
          status_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_answering_setups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_answering_setups_live_version_fk"
            columns: ["live_version_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setup_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_audit_events: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          business_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          setup_id: string | null
        }
        Insert: {
          action: string
          actor_type?: string
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          setup_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          business_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          setup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sba_audit_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_audit_events_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_businesses: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          name: string
          owner_user_id: string | null
          public_email: string | null
          public_phone: string | null
          status: string
          submitted_website: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          owner_user_id?: string | null
          public_email?: string | null
          public_phone?: string | null
          status?: string
          submitted_website?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          owner_user_id?: string | null
          public_email?: string | null
          public_phone?: string | null
          status?: string
          submitted_website?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sba_call_outcomes: {
        Row: {
          call_id: string
          created_at: string
          detail: string
          id: string
          outcome_type: Database["public"]["Enums"]["sba_outcome_type"]
          payload: Json
          status: string
          title: string
        }
        Insert: {
          call_id: string
          created_at?: string
          detail: string
          id?: string
          outcome_type: Database["public"]["Enums"]["sba_outcome_type"]
          payload?: Json
          status: string
          title: string
        }
        Update: {
          call_id?: string
          created_at?: string
          detail?: string
          id?: string
          outcome_type?: Database["public"]["Enums"]["sba_outcome_type"]
          payload?: Json
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_call_outcomes_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "sba_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_call_transcript_turns: {
        Row: {
          call_id: string
          created_at: string
          ended_at_ms: number | null
          id: string
          interrupted: boolean
          sequence: number
          source: string
          speaker: Database["public"]["Enums"]["sba_transcript_speaker"]
          started_at_ms: number | null
          text: string
        }
        Insert: {
          call_id: string
          created_at?: string
          ended_at_ms?: number | null
          id?: string
          interrupted?: boolean
          sequence: number
          source?: string
          speaker: Database["public"]["Enums"]["sba_transcript_speaker"]
          started_at_ms?: number | null
          text: string
        }
        Update: {
          call_id?: string
          created_at?: string
          ended_at_ms?: number | null
          id?: string
          interrupted?: boolean
          sequence?: number
          source?: string
          speaker?: Database["public"]["Enums"]["sba_transcript_speaker"]
          started_at_ms?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_call_transcript_turns_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "sba_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_calls: {
        Row: {
          audio_chunk_count: number
          audio_url: string | null
          business_id: string
          caller_name: string | null
          caller_phone: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          metadata: Json
          mode: Database["public"]["Enums"]["sba_call_mode"]
          outcome: string | null
          owner_notified: boolean
          provider: string | null
          provider_call_id: string | null
          recording_status: string
          setup_id: string
          setup_revision: number
          setup_version_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["sba_call_status"]
          summary: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          audio_chunk_count?: number
          audio_url?: string | null
          business_id: string
          caller_name?: string | null
          caller_phone?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          mode?: Database["public"]["Enums"]["sba_call_mode"]
          outcome?: string | null
          owner_notified?: boolean
          provider?: string | null
          provider_call_id?: string | null
          recording_status?: string
          setup_id: string
          setup_revision: number
          setup_version_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["sba_call_status"]
          summary?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          audio_chunk_count?: number
          audio_url?: string | null
          business_id?: string
          caller_name?: string | null
          caller_phone?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          metadata?: Json
          mode?: Database["public"]["Enums"]["sba_call_mode"]
          outcome?: string | null
          owner_notified?: boolean
          provider?: string | null
          provider_call_id?: string | null
          recording_status?: string
          setup_id?: string
          setup_revision?: number
          setup_version_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["sba_call_status"]
          summary?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_calls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_calls_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_calls_setup_version_id_fkey"
            columns: ["setup_version_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setup_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_guest_sessions: {
        Row: {
          business_id: string | null
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          expires_at: string
          id: string
          last_seen_at: string
          public_token_hash: string
          setup_document: Json | null
          setup_id: string | null
          setup_revision: number
          source_documents: Json
          state: Database["public"]["Enums"]["sba_session_state"]
          submitted_business: string | null
          submitted_website: string | null
          test_activity: Json
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          public_token_hash: string
          setup_document?: Json | null
          setup_id?: string | null
          setup_revision?: number
          source_documents?: Json
          state?: Database["public"]["Enums"]["sba_session_state"]
          submitted_business?: string | null
          submitted_website?: string | null
          test_activity?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          public_token_hash?: string
          setup_document?: Json | null
          setup_id?: string | null
          setup_revision?: number
          source_documents?: Json
          state?: Database["public"]["Enums"]["sba_session_state"]
          submitted_business?: string | null
          submitted_website?: string | null
          test_activity?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_guest_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_guest_sessions_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_integration_connections: {
        Row: {
          business_id: string
          connection_type: string
          created_at: string
          display_name: string
          external_account_id: string | null
          id: string
          metadata: Json
          provider: string | null
          secret_reference: string | null
          status: Database["public"]["Enums"]["sba_integration_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          connection_type: string
          created_at?: string
          display_name: string
          external_account_id?: string | null
          id?: string
          metadata?: Json
          provider?: string | null
          secret_reference?: string | null
          status?: Database["public"]["Enums"]["sba_integration_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          connection_type?: string
          created_at?: string
          display_name?: string
          external_account_id?: string | null
          id?: string
          metadata?: Json
          provider?: string | null
          secret_reference?: string | null
          status?: Database["public"]["Enums"]["sba_integration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_integration_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_messages: {
        Row: {
          body: string
          business_id: string
          call_id: string | null
          category: string
          channel: string
          created_at: string
          error_message: string | null
          id: string
          mode: Database["public"]["Enums"]["sba_call_mode"]
          provider: string | null
          provider_message_id: string | null
          recipient_address: string | null
          recipient_label: string | null
          request_id: string | null
          sent_at: string | null
          setup_id: string
          status: Database["public"]["Enums"]["sba_message_status"]
        }
        Insert: {
          body: string
          business_id: string
          call_id?: string | null
          category: string
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["sba_call_mode"]
          provider?: string | null
          provider_message_id?: string | null
          recipient_address?: string | null
          recipient_label?: string | null
          request_id?: string | null
          sent_at?: string | null
          setup_id: string
          status?: Database["public"]["Enums"]["sba_message_status"]
        }
        Update: {
          body?: string
          business_id?: string
          call_id?: string | null
          category?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["sba_call_mode"]
          provider?: string | null
          provider_message_id?: string | null
          recipient_address?: string | null
          recipient_label?: string | null
          request_id?: string | null
          sent_at?: string | null
          setup_id?: string
          status?: Database["public"]["Enums"]["sba_message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sba_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_messages_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "sba_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sba_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_messages_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_phone_numbers: {
        Row: {
          business_id: string
          created_at: string
          display_number: string | null
          e164: string | null
          forwarding_mode: string
          forwarding_status: string
          id: string
          metadata: Json
          number_type: string
          provider: string | null
          provider_number_id: string | null
          status: Database["public"]["Enums"]["sba_phone_number_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          display_number?: string | null
          e164?: string | null
          forwarding_mode?: string
          forwarding_status?: string
          id?: string
          metadata?: Json
          number_type?: string
          provider?: string | null
          provider_number_id?: string | null
          status?: Database["public"]["Enums"]["sba_phone_number_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          display_number?: string | null
          e164?: string | null
          forwarding_mode?: string
          forwarding_status?: string
          id?: string
          metadata?: Json
          number_type?: string
          provider?: string | null
          provider_number_id?: string | null
          status?: Database["public"]["Enums"]["sba_phone_number_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_phone_numbers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_requests: {
        Row: {
          business_id: string
          call_id: string | null
          caller_email: string | null
          caller_name: string | null
          caller_phone: string | null
          collected_fields: Json
          created_at: string
          id: string
          preferred_time: string | null
          request_type: Database["public"]["Enums"]["sba_request_type"]
          service_id: string | null
          setup_id: string
          status: Database["public"]["Enums"]["sba_request_status"]
          summary: string | null
          test_mode: boolean
          updated_at: string
          urgency: string
        }
        Insert: {
          business_id: string
          call_id?: string | null
          caller_email?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          collected_fields?: Json
          created_at?: string
          id?: string
          preferred_time?: string | null
          request_type: Database["public"]["Enums"]["sba_request_type"]
          service_id?: string | null
          setup_id: string
          status?: Database["public"]["Enums"]["sba_request_status"]
          summary?: string | null
          test_mode?: boolean
          updated_at?: string
          urgency?: string
        }
        Update: {
          business_id?: string
          call_id?: string | null
          caller_email?: string | null
          caller_name?: string | null
          caller_phone?: string | null
          collected_fields?: Json
          created_at?: string
          id?: string
          preferred_time?: string | null
          request_type?: Database["public"]["Enums"]["sba_request_type"]
          service_id?: string | null
          setup_id?: string
          status?: Database["public"]["Enums"]["sba_request_status"]
          summary?: string | null
          test_mode?: boolean
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_requests_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "sba_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_requests_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_runtime_compilations: {
        Row: {
          compiled_runtime: Json
          compiler_id: string
          compiler_model: string
          coverage_report: Json
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["sba_call_mode"]
          setup_id: string
          setup_revision: number
          source_hash: string
          status: string
          warnings: Json
        }
        Insert: {
          compiled_runtime: Json
          compiler_id: string
          compiler_model: string
          coverage_report?: Json
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["sba_call_mode"]
          setup_id: string
          setup_revision: number
          source_hash: string
          status?: string
          warnings?: Json
        }
        Update: {
          compiled_runtime?: Json
          compiler_id?: string
          compiler_model?: string
          coverage_report?: Json
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["sba_call_mode"]
          setup_id?: string
          setup_revision?: number
          source_hash?: string
          status?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sba_runtime_compilations_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_source_documents: {
        Row: {
          business_id: string
          canonical_source_id: string | null
          content_hash: string | null
          extracted_text: string
          fetch_metadata: Json
          fetched_at: string
          id: string
          page_title: string | null
          provider: string
          setup_id: string | null
          url: string
        }
        Insert: {
          business_id: string
          canonical_source_id?: string | null
          content_hash?: string | null
          extracted_text: string
          fetch_metadata?: Json
          fetched_at?: string
          id?: string
          page_title?: string | null
          provider?: string
          setup_id?: string | null
          url: string
        }
        Update: {
          business_id?: string
          canonical_source_id?: string | null
          content_hash?: string | null
          extracted_text?: string
          fetch_metadata?: Json
          fetched_at?: string
          id?: string
          page_title?: string | null
          provider?: string
          setup_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_source_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_source_documents_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "sba_answering_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_subscriptions: {
        Row: {
          business_id: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_key: string
          status: Database["public"]["Enums"]["sba_subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_key?: string
          status?: Database["public"]["Enums"]["sba_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_key?: string
          status?: Database["public"]["Enums"]["sba_subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sba_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sba_usage_events: {
        Row: {
          billable: boolean
          business_id: string
          call_id: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          quantity: number
        }
        Insert: {
          billable?: boolean
          business_id: string
          call_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          quantity: number
        }
        Update: {
          billable?: boolean
          business_id?: string
          call_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "sba_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "sba_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_usage_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "sba_calls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      sba_call_mode: "test" | "live"
      sba_call_status:
        | "connecting"
        | "active"
        | "completed"
        | "failed"
        | "abandoned"
        | "blocked_spam"
      sba_change_source:
        | "manual_ui"
        | "setup_assistant"
        | "website_builder"
        | "system"
        | "integration"
      sba_change_status: "proposed" | "applied" | "rejected"
      sba_integration_status:
        | "not_connected"
        | "pending"
        | "connected"
        | "paused"
        | "failed"
      sba_message_status:
        | "captured"
        | "prepared"
        | "simulated"
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
      sba_outcome_type:
        | "details"
        | "request"
        | "message"
        | "followup"
        | "alert"
        | "transfer"
        | "urgent"
      sba_phone_number_status:
        | "not_connected"
        | "pending"
        | "active"
        | "paused"
        | "failed"
        | "released"
      sba_request_status:
        | "new"
        | "contacted"
        | "booked"
        | "completed"
        | "archived"
      sba_request_type:
        | "appointment"
        | "message"
        | "callback"
        | "urgent"
        | "service"
        | "other"
      sba_session_state:
        | "created"
        | "importing"
        | "test_ready"
        | "tested"
        | "saved"
        | "claimed"
        | "expired"
      sba_subscription_status:
        | "none"
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "canceled"
      sba_transcript_speaker: "caller" | "setup" | "system"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      sba_call_mode: ["test", "live"],
      sba_call_status: [
        "connecting",
        "active",
        "completed",
        "failed",
        "abandoned",
        "blocked_spam",
      ],
      sba_change_source: [
        "manual_ui",
        "setup_assistant",
        "website_builder",
        "system",
        "integration",
      ],
      sba_change_status: ["proposed", "applied", "rejected"],
      sba_integration_status: [
        "not_connected",
        "pending",
        "connected",
        "paused",
        "failed",
      ],
      sba_message_status: [
        "captured",
        "prepared",
        "simulated",
        "queued",
        "sent",
        "delivered",
        "failed",
      ],
      sba_outcome_type: [
        "details",
        "request",
        "message",
        "followup",
        "alert",
        "transfer",
        "urgent",
      ],
      sba_phone_number_status: [
        "not_connected",
        "pending",
        "active",
        "paused",
        "failed",
        "released",
      ],
      sba_request_status: [
        "new",
        "contacted",
        "booked",
        "completed",
        "archived",
      ],
      sba_request_type: [
        "appointment",
        "message",
        "callback",
        "urgent",
        "service",
        "other",
      ],
      sba_session_state: [
        "created",
        "importing",
        "test_ready",
        "tested",
        "saved",
        "claimed",
        "expired",
      ],
      sba_subscription_status: [
        "none",
        "trialing",
        "active",
        "past_due",
        "paused",
        "canceled",
      ],
      sba_transcript_speaker: ["caller", "setup", "system"],
    },
  },
} as const
