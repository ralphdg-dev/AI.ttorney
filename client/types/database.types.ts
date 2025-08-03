export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
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
          reason?: string | null
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
          reason?: string | null
          role?: string | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flagged: {
        Row: {
          flagged_at: string | null
          flagged_by: string | null
          id: number
          log_id: number | null
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          flagged_at?: string | null
          flagged_by?: string | null
          id?: number
          log_id?: number | null
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          flagged_at?: string | null
          flagged_by?: string | null
          id?: number
          log_id?: number | null
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_flagged_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_flagged_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "chatbot_logs"
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
          id: string
          lawyer_id: string | null
          message: string
          requested_at: string | null
          responded_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lawyer_id?: string | null
          message: string
          requested_at?: string | null
          responded_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lawyer_id?: string | null
          message?: string
          requested_at?: string | null
          responded_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_requests_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      forum_posts: {
        Row: {
          body: string
          created_at: string | null
          domain: string | null
          id: string
          is_anonymous: boolean | null
          is_flagged: boolean | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          domain?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          domain?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          title?: string
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
          reporter_id: string | null
          submitted_at: string | null
          target_id: string
          target_type: string | null
        }
        Insert: {
          id?: string
          reason: string
          reporter_id?: string | null
          submitted_at?: string | null
          target_id: string
          target_type?: string | null
        }
        Update: {
          id?: string
          reason?: string
          reporter_id?: string | null
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
          created_at: string | null
          definition_en: string
          definition_fil: string | null
          domain: string | null
          example_en: string | null
          example_fil: string | null
          id: number
          term_en: string
          term_fil: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          definition_en: string
          definition_fil?: string | null
          domain?: string | null
          example_en?: string | null
          example_fil?: string | null
          id?: number
          term_en: string
          term_fil?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          definition_en?: string
          definition_fil?: string | null
          domain?: string | null
          example_en?: string | null
          example_fil?: string | null
          id?: number
          term_en?: string
          term_fil?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      lawyer_applications: {
        Row: {
          admin_notes: string | null
          full_name: string
          ibp_id: string
          id: string
          matched_at: string | null
          matched_roll_id: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          roll_number: string | null
          roll_signing_date: string
          selfie_with_id: string
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          full_name: string
          ibp_id: string
          id?: string
          matched_at?: string | null
          matched_roll_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roll_number?: string | null
          roll_signing_date: string
          selfie_with_id: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          full_name?: string
          ibp_id?: string
          id?: string
          matched_at?: string | null
          matched_roll_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roll_number?: string | null
          roll_signing_date?: string
          selfie_with_id?: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
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
            foreignKeyName: "lawyer_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      legal_articles: {
        Row: {
          content_en: string
          content_fil: string | null
          created_at: string | null
          created_by: string | null
          domain: string | null
          id: number
          is_verified: boolean | null
          title_en: string
          title_fil: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          content_en: string
          content_fil?: string | null
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          id?: number
          is_verified?: boolean | null
          title_en: string
          title_fil?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          content_en?: string
          content_fil?: string | null
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          id?: number
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
          glossary_id: number | null
          id: string
          user_id: string | null
        }
        Insert: {
          favorited_at?: string | null
          glossary_id?: number | null
          id?: string
          user_id?: string | null
        }
        Update: {
          favorited_at?: string | null
          glossary_id?: number | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_glossary_favorites_glossary_id_fkey"
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
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          password_hash: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role:
        | "guest"
        | "registered_user"
        | "verified_lawyer"
        | "admin"
        | "superadmin"
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
      user_role: [
        "guest",
        "registered_user",
        "verified_lawyer",
        "admin",
        "superadmin",
      ],
    },
  },
} as const
