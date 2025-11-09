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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["admin_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["admin_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["admin_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          model_version: string | null
          response_time_ms: number | null
          role: string
          session_id: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          response_time_ms?: number | null
          role: string
          session_id: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          response_time_ms?: number | null
          role?: string
          session_id?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_recent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_statistics"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          language: string | null
          last_message_at: string | null
          message_count: number | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          language?: string | null
          last_message_at?: string | null
          message_count?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          language?: string | null
          last_message_at?: string | null
          message_count?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_logs: {
        Row: {
          created_at: string | null
          flagged: boolean | null
          id: number
          question: string
          response: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          flagged?: boolean | null
          id?: number
          question: string
          response: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          flagged?: boolean | null
          id?: number
          question?: string
          response?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_requests: {
        Row: {
          consultation_date: string
          consultation_mode: Database["public"]["Enums"]["consultation_mode"]
          consultation_time: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string
          id: string
          lawyer_id: string
          message: string
          mobile_number: string
          responded_at: string | null
          status: Database["public"]["Enums"]["consultation_status"]
          user_id: string
        }
        Insert: {
          consultation_date: string
          consultation_mode: Database["public"]["Enums"]["consultation_mode"]
          consultation_time: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          id?: string
          lawyer_id: string
          message: string
          mobile_number: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          user_id: string
        }
        Update: {
          consultation_date?: string
          consultation_mode?: Database["public"]["Enums"]["consultation_mode"]
          consultation_time?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          id?: string
          lawyer_id?: string
          message?: string
          mobile_number?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_requests_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_requests_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_posts: {
        Row: {
          created_at: string
          flagged_at: string
          flagged_by_admin_id: string
          forum_post_id: string
          id: number
          reason: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          flagged_at?: string
          flagged_by_admin_id: string
          forum_post_id: string
          id?: number
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          flagged_at?: string
          flagged_by_admin_id?: string
          forum_post_id?: string
          id?: number
          reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flagged_posts_flagged_by_admin_id_fkey"
            columns: ["flagged_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_posts_forum_post_id_fkey"
            columns: ["forum_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_posts_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["legal_category"] | null
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          is_flagged: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          category?: Database["public"]["Enums"]["legal_category"] | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["legal_category"] | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          created_at: string | null
          id: string
          is_flagged: boolean | null
          post_id: string | null
          reply_body: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_flagged?: boolean | null
          post_id?: string | null
          reply_body: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_flagged?: boolean | null
          post_id?: string | null
          reply_body?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          id: string
          reason: string
          reason_context: string | null
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          submitted_at: string | null
          target_id: string
          target_type: string | null
        }
        Insert: {
          id?: string
          reason: string
          reason_context?: string | null
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          submitted_at?: string | null
          target_id: string
          target_type?: string | null
        }
        Update: {
          id?: string
          reason?: string
          reason_context?: string | null
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          submitted_at?: string | null
          target_id?: string
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_terms: {
        Row: {
          category: Database["public"]["Enums"]["legal_category"] | null
          created_at: string | null
          created_by: string | null
          definition_en: string | null
          definition_fil: string | null
          example_en: string | null
          example_fil: string | null
          id: string
          is_verified: boolean | null
          term_en: string
          term_fil: string | null
          updated_at: string | null
          verified_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["legal_category"] | null
          created_at?: string | null
          created_by?: string | null
          definition_en?: string | null
          definition_fil?: string | null
          example_en?: string | null
          example_fil?: string | null
          id?: string
          is_verified?: boolean | null
          term_en: string
          term_fil?: string | null
          updated_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["legal_category"] | null
          created_at?: string | null
          created_by?: string | null
          definition_en?: string | null
          definition_fil?: string | null
          example_en?: string | null
          example_fil?: string | null
          id?: string
          is_verified?: boolean | null
          term_en?: string
          term_fil?: string | null
          updated_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glossary_terms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_applications: {
        Row: {
          admin_notes: string | null
          archived: boolean | null
          full_name: string
          ibp_id: string
          id: string
          is_latest: boolean | null
          matched_at: string | null
          matched_roll_id: number | null
          parent_application_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roll_number: string | null
          roll_signing_date: string
          selfie: string
          status:
            | Database["public"]["Enums"]["lawyer_application_status"]
            | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          admin_notes?: string | null
          archived?: boolean | null
          full_name: string
          ibp_id: string
          id?: string
          is_latest?: boolean | null
          matched_at?: string | null
          matched_roll_id?: number | null
          parent_application_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roll_number?: string | null
          roll_signing_date: string
          selfie: string
          status?:
            | Database["public"]["Enums"]["lawyer_application_status"]
            | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          admin_notes?: string | null
          archived?: boolean | null
          full_name?: string
          ibp_id?: string
          id?: string
          is_latest?: boolean | null
          matched_at?: string | null
          matched_roll_id?: number | null
          parent_application_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roll_number?: string | null
          roll_signing_date?: string
          selfie?: string
          status?:
            | Database["public"]["Enums"]["lawyer_application_status"]
            | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_applications_matched_roll_id_fkey"
            columns: ["matched_roll_id"]
            isOneToOne: false
            referencedRelation: "supreme_court_roll"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_parent_application_id_fkey"
            columns: ["parent_application_id"]
            isOneToOne: false
            referencedRelation: "lawyer_application_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_parent_application_id_fkey"
            columns: ["parent_application_id"]
            isOneToOne: false
            referencedRelation: "lawyer_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_info: {
        Row: {
          accepting_consultations: boolean | null
          bio: string | null
          created_at: string | null
          days: string | null
          hours_available: Json | null
          id: string
          lawyer_id: string
          location: string | null
          name: string
          phone_number: string | null
          specialization: string | null
        }
        Insert: {
          accepting_consultations?: boolean | null
          bio?: string | null
          created_at?: string | null
          days?: string | null
          hours_available?: Json | null
          id?: string
          lawyer_id: string
          location?: string | null
          name: string
          phone_number?: string | null
          specialization?: string | null
        }
        Update: {
          accepting_consultations?: boolean | null
          bio?: string | null
          created_at?: string | null
          days?: string | null
          hours_available?: Json | null
          id?: string
          lawyer_id?: string
          location?: string | null
          name?: string
          phone_number?: string | null
          specialization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_info_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_articles: {
        Row: {
          category: Database["public"]["Enums"]["legal_category"]
          content_en: string | null
          content_fil: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description_en: string
          description_fil: string | null
          id: string
          image_article: string | null
          is_verified: boolean | null
          title_en: string
          title_fil: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["legal_category"]
          content_en?: string | null
          content_fil?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description_en: string
          description_fil?: string | null
          id?: string
          image_article?: string | null
          is_verified?: boolean | null
          title_en: string
          title_fil?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["legal_category"]
          content_en?: string | null
          content_fil?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description_en?: string
          description_fil?: string | null
          id?: string
          image_article?: string | null
          is_verified?: boolean | null
          title_en?: string
          title_fil?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_articles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      supreme_court_roll: {
        Row: {
          full_name: string
          id: number
          roll_number: string
          roll_signing_date: string
        }
        Insert: {
          full_name: string
          id?: number
          roll_number: string
          roll_signing_date: string
        }
        Update: {
          full_name?: string
          id?: number
          roll_number?: string
          roll_signing_date?: string
        }
        Relationships: []
      }
      suspension_appeals: {
        Row: {
          additional_context: string | null
          admin_notes: string | null
          appeal_reason: string
          created_at: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suspension_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_context?: string | null
          admin_notes?: string | null
          appeal_reason: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspension_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_context?: string | null
          admin_notes?: string | null
          appeal_reason?: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspension_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspension_appeals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspension_appeals_suspension_id_fkey"
            columns: ["suspension_id"]
            isOneToOne: false
            referencedRelation: "user_suspensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspension_appeals_suspension_id_fkey"
            columns: ["suspension_id"]
            isOneToOne: false
            referencedRelation: "user_suspensions_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspension_appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_forum_bookmarks: {
        Row: {
          bookmarked_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          bookmarked_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          bookmarked_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_forum_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_forum_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_glossary_favorites: {
        Row: {
          favorited_at: string | null
          glossary_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          favorited_at?: string | null
          glossary_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          favorited_at?: string | null
          glossary_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_glossary_terms"
            columns: ["glossary_id"]
            isOneToOne: false
            referencedRelation: "glossary_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_glossary_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_guide_bookmarks: {
        Row: {
          article_id: string
          bookmarked_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          bookmarked_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          bookmarked_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          lifted_acknowledged: boolean | null
          lifted_at: string | null
          lifted_by: string | null
          lifted_reason: string | null
          reason: string
          started_at: string
          status: string
          strikes_at_suspension: number
          suspension_number: number
          suspension_type: Database["public"]["Enums"]["suspension_type"]
          updated_at: string
          user_id: string
          violation_ids: string[]
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          lifted_acknowledged?: boolean | null
          lifted_at?: string | null
          lifted_by?: string | null
          lifted_reason?: string | null
          reason: string
          started_at?: string
          status?: string
          strikes_at_suspension?: number
          suspension_number: number
          suspension_type: Database["public"]["Enums"]["suspension_type"]
          updated_at?: string
          user_id: string
          violation_ids?: string[]
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          lifted_acknowledged?: boolean | null
          lifted_at?: string | null
          lifted_by?: string | null
          lifted_reason?: string | null
          reason?: string
          started_at?: string
          status?: string
          strikes_at_suspension?: number
          suspension_number?: number
          suspension_type?: Database["public"]["Enums"]["suspension_type"]
          updated_at?: string
          user_id?: string
          violation_ids?: string[]
        }
        Relationships: []
      }
      user_violations: {
        Row: {
          action_taken: Database["public"]["Enums"]["action_taken"]
          category_scores: Json
          content_id: string | null
          content_text: string
          created_at: string
          flagged_categories: Json
          id: string
          strike_count_after: number
          suspension_count_after: number
          user_id: string
          violation_summary: string
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Insert: {
          action_taken: Database["public"]["Enums"]["action_taken"]
          category_scores: Json
          content_id?: string | null
          content_text: string
          created_at?: string
          flagged_categories: Json
          id?: string
          strike_count_after: number
          suspension_count_after: number
          user_id: string
          violation_summary: string
          violation_type: Database["public"]["Enums"]["violation_type"]
        }
        Update: {
          action_taken?: Database["public"]["Enums"]["action_taken"]
          category_scores?: Json
          content_id?: string | null
          content_text?: string
          created_at?: string
          flagged_categories?: Json
          id?: string
          strike_count_after?: number
          suspension_count_after?: number
          user_id?: string
          violation_summary?: string
          violation_type?: Database["public"]["Enums"]["violation_type"]
        }
        Relationships: []
      }
      users: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          archived: boolean | null
          auth_provider: string
          banned_at: string | null
          banned_reason: string | null
          birthdate: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_blocked_from_applying: boolean | null
          is_verified: boolean | null
          last_rejected_at: string | null
          last_violation_at: string | null
          pending_lawyer: boolean | null
          profile_photo: string | null
          reject_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          strike_count: number | null
          suspension_count: number
          suspension_end: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          archived?: boolean | null
          auth_provider?: string
          banned_at?: string | null
          banned_reason?: string | null
          birthdate?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_blocked_from_applying?: boolean | null
          is_verified?: boolean | null
          last_rejected_at?: string | null
          last_violation_at?: string | null
          pending_lawyer?: boolean | null
          profile_photo?: string | null
          reject_count?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          strike_count?: number | null
          suspension_count?: number
          suspension_end?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          archived?: boolean | null
          auth_provider?: string
          banned_at?: string | null
          banned_reason?: string | null
          birthdate?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_blocked_from_applying?: boolean | null
          is_verified?: boolean | null
          last_rejected_at?: string | null
          last_violation_at?: string | null
          pending_lawyer?: boolean | null
          profile_photo?: string | null
          reject_count?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          strike_count?: number | null
          suspension_count?: number
          suspension_end?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_consultation_requests: {
        Row: {
          consultation_date: string | null
          consultation_mode:
            | Database["public"]["Enums"]["consultation_mode"]
            | null
          consultation_time: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string | null
          lawyer_id: string | null
          message: string | null
          mobile_number: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["consultation_status"] | null
          user_id: string | null
        }
        Insert: {
          consultation_date?: string | null
          consultation_mode?:
            | Database["public"]["Enums"]["consultation_mode"]
            | null
          consultation_time?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string | null
          lawyer_id?: string | null
          message?: string | null
          mobile_number?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"] | null
          user_id?: string | null
        }
        Update: {
          consultation_date?: string | null
          consultation_mode?:
            | Database["public"]["Enums"]["consultation_mode"]
            | null
          consultation_time?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string | null
          lawyer_id?: string | null
          message?: string | null
          mobile_number?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_requests_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_requests_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "lawyer_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_application_history: {
        Row: {
          admin_notes: string | null
          application_type: string | null
          full_name: string | null
          ibp_id: string | null
          id: string | null
          is_latest: boolean | null
          matched_at: string | null
          matched_roll_id: number | null
          parent_application_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roll_number: string | null
          roll_signing_date: string | null
          selfie: string | null
          status:
            | Database["public"]["Enums"]["lawyer_application_status"]
            | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          admin_notes?: string | null
          application_type?: never
          full_name?: string | null
          ibp_id?: string | null
          id?: string | null
          is_latest?: boolean | null
          matched_at?: string | null
          matched_roll_id?: number | null
          parent_application_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roll_number?: string | null
          roll_signing_date?: string | null
          selfie?: string | null
          status?:
            | Database["public"]["Enums"]["lawyer_application_status"]
            | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          admin_notes?: string | null
          application_type?: never
          full_name?: string | null
          ibp_id?: string | null
          id?: string | null
          is_latest?: boolean | null
          matched_at?: string | null
          matched_roll_id?: number | null
          parent_application_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roll_number?: string | null
          roll_signing_date?: string | null
          selfie?: string | null
          status?:
            | Database["public"]["Enums"]["lawyer_application_status"]
            | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_applications_matched_roll_id_fkey"
            columns: ["matched_roll_id"]
            isOneToOne: false
            referencedRelation: "supreme_court_roll"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_parent_application_id_fkey"
            columns: ["parent_application_id"]
            isOneToOne: false
            referencedRelation: "lawyer_application_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_parent_application_id_fkey"
            columns: ["parent_application_id"]
            isOneToOne: false
            referencedRelation: "lawyer_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lawyer_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suspensions_legacy: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          lifted_at: string | null
          lifted_by: string | null
          lifted_reason: string | null
          reason: string | null
          strikes_at_suspension: number | null
          suspension_end: string | null
          suspension_number: number | null
          suspension_start: string | null
          suspension_type: Database["public"]["Enums"]["suspension_type"] | null
          updated_at: string | null
          user_id: string | null
          violation_ids: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: never
          lifted_at?: string | null
          lifted_by?: string | null
          lifted_reason?: string | null
          reason?: string | null
          strikes_at_suspension?: number | null
          suspension_end?: string | null
          suspension_number?: number | null
          suspension_start?: string | null
          suspension_type?:
            | Database["public"]["Enums"]["suspension_type"]
            | null
          updated_at?: string | null
          user_id?: string | null
          violation_ids?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: never
          lifted_at?: string | null
          lifted_by?: string | null
          lifted_reason?: string | null
          reason?: string | null
          strikes_at_suspension?: number | null
          suspension_end?: string | null
          suspension_number?: number | null
          suspension_start?: string | null
          suspension_type?:
            | Database["public"]["Enums"]["suspension_type"]
            | null
          updated_at?: string | null
          user_id?: string | null
          violation_ids?: string[] | null
        }
        Relationships: []
      }
      v_recent_sessions: {
        Row: {
          created_at: string | null
          id: string | null
          is_archived: boolean | null
          language: string | null
          last_message_at: string | null
          last_message_preview: string | null
          message_count: number | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          language?: string | null
          last_message_at?: string | null
          last_message_preview?: never
          message_count?: number | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_archived?: boolean | null
          language?: string | null
          last_message_at?: string | null
          last_message_preview?: never
          message_count?: number | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_session_statistics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          last_message_at: string | null
          message_count: number | null
          session_id: string | null
          title: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_reset_expired_suspensions: { Args: never; Returns: undefined }
      get_consultation_stats: {
        Args: { p_lawyer_id?: string; p_user_id?: string }
        Returns: {
          accepted_requests: number
          pending_requests: number
          rejected_requests: number
          total_requests: number
        }[]
      }
      get_lawyer_available_days: {
        Args: { p_lawyer_id: string }
        Returns: string[]
      }
      get_lawyer_time_slots: {
        Args: { p_day: string; p_lawyer_id: string }
        Returns: string[]
      }
      get_user_suspension_status: {
        Args: { p_user_id: string }
        Returns: {
          ends_at: string
          is_suspended: boolean
          reason: string
          suspension_type: Database["public"]["Enums"]["suspension_type"]
        }[]
      }
      get_user_violation_stats: {
        Args: { p_user_id: string }
        Returns: {
          last_violation_date: string
          total_violations: number
          violations_by_type: Json
        }[]
      }
      is_lawyer_available_on_day: {
        Args: { p_day: string; p_lawyer_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "banned" | "restricted"
      action_taken: "strike_added" | "suspended" | "banned"
      admin_status: "active" | "disabled" | "archived"
      consultation_mode: "onsite" | "online" | "phone"
      consultation_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      lawyer_application_status:
        | "pending"
        | "resubmission"
        | "accepted"
        | "rejected"
      legal_category:
        | "family"
        | "criminal"
        | "civil"
        | "labor"
        | "consumer"
        | "others"
      report_status: "pending" | "dismissed" | "sanctioned"
      specializations:
        | "Criminal Law"
        | "Civil Law"
        | "Family Law"
        | "Corporate and Commercial Law"
        | "Labor Law"
        | "Taxation"
        | "Intellectual Property"
        | "Environmental Law"
        | "Immigration Law"
        | "Political Law"
      suspension_type: "temporary" | "permanent"
      user_role:
        | "guest"
        | "registered_user"
        | "verified_lawyer"
        | "admin"
        | "superadmin"
      violation_type: "forum_post" | "forum_reply" | "chatbot_prompt"
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
      account_status: ["active", "suspended", "banned", "restricted"],
      action_taken: ["strike_added", "suspended", "banned"],
      admin_status: ["active", "disabled", "archived"],
      consultation_mode: ["onsite", "online", "phone"],
      consultation_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      lawyer_application_status: [
        "pending",
        "resubmission",
        "accepted",
        "rejected",
      ],
      legal_category: [
        "family",
        "criminal",
        "civil",
        "labor",
        "consumer",
        "others",
      ],
      report_status: ["pending", "dismissed", "sanctioned"],
      specializations: [
        "Criminal Law",
        "Civil Law",
        "Family Law",
        "Corporate and Commercial Law",
        "Labor Law",
        "Taxation",
        "Intellectual Property",
        "Environmental Law",
        "Immigration Law",
        "Political Law",
      ],
      suspension_type: ["temporary", "permanent"],
      user_role: [
        "guest",
        "registered_user",
        "verified_lawyer",
        "admin",
        "superadmin",
      ],
      violation_type: ["forum_post", "forum_reply", "chatbot_prompt"],
    },
  },
} as const
