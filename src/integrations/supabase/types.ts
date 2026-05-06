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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blockchains: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      comparison_requests: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          price_alert: boolean
          review_like: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_alert?: boolean
          review_like?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price_alert?: boolean
          review_like?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          created_at: string
          id: string
          project_id: string
          token_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          token_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          token_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_holdings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          created_at: string
          direction: string
          id: string
          is_enabled: boolean
          last_known_price: number | null
          last_triggered_at: string | null
          project_id: string
          threshold_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          id?: string
          is_enabled?: boolean
          last_known_price?: number | null
          last_triggered_at?: string | null
          project_id: string
          threshold_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          is_enabled?: boolean
          last_known_price?: number | null
          last_triggered_at?: string | null
          project_id?: string
          threshold_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_comparisons: {
        Row: {
          ai_response: Json
          comparison_type: Database["public"]["Enums"]["comparison_type"]
          created_at: string
          id: string
          normalized_key: string
          project_a_id: string
          project_b_id: string
          updated_at: string
          user_prompt: string | null
        }
        Insert: {
          ai_response: Json
          comparison_type?: Database["public"]["Enums"]["comparison_type"]
          created_at?: string
          id?: string
          normalized_key: string
          project_a_id: string
          project_b_id: string
          updated_at?: string
          user_prompt?: string | null
        }
        Update: {
          ai_response?: Json
          comparison_type?: Database["public"]["Enums"]["comparison_type"]
          created_at?: string
          id?: string
          normalized_key?: string
          project_a_id?: string
          project_b_id?: string
          updated_at?: string
          user_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_comparisons_project_a_id_fkey"
            columns: ["project_a_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comparisons_project_b_id_fkey"
            columns: ["project_b_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_infrastructure: {
        Row: {
          created_at: string
          display_order: number
          icon_name: string | null
          id: string
          label: string
          link_url: string | null
          project_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          label: string
          link_url?: string | null
          project_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          label?: string
          link_url?: string | null
          project_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_infrastructure_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_ratings: {
        Row: {
          adoption_rating: number
          created_at: string
          hardware_rating: number
          id: string
          project_id: string
          tokenomics_rating: number
          updated_at: string
          user_id: string
          utility_rating: number
        }
        Insert: {
          adoption_rating: number
          created_at?: string
          hardware_rating: number
          id?: string
          project_id: string
          tokenomics_rating: number
          updated_at?: string
          user_id: string
          utility_rating: number
        }
        Update: {
          adoption_rating?: number
          created_at?: string
          hardware_rating?: number
          id?: string
          project_id?: string
          tokenomics_rating?: number
          updated_at?: string
          user_id?: string
          utility_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_ratings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_submissions: {
        Row: {
          blockchain: string
          category: string
          created_at: string
          description: string
          discord_url: string
          id: string
          logo_url: string | null
          name: string
          status: string
          submitter_id: string
          tagline: string
          token: string
          twitter_url: string
          updated_at: string
          website: string
        }
        Insert: {
          blockchain: string
          category: string
          created_at?: string
          description: string
          discord_url?: string
          id?: string
          logo_url?: string | null
          name: string
          status?: string
          submitter_id: string
          tagline: string
          token?: string
          twitter_url?: string
          updated_at?: string
          website?: string
        }
        Update: {
          blockchain?: string
          category?: string
          created_at?: string
          description?: string
          discord_url?: string
          id?: string
          logo_url?: string | null
          name?: string
          status?: string
          submitter_id?: string
          tagline?: string
          token?: string
          twitter_url?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      project_trending_scores: {
        Row: {
          project_id: string
          score: number
          updated_at: string
        }
        Insert: {
          project_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          project_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_trending_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          blockchain: string
          category: string
          coingecko_id: string | null
          created_at: string
          description: string
          discord_url: string
          id: string
          logo_emoji: string
          logo_url: string | null
          name: string
          slug: string
          status: string
          tagline: string
          token: string
          twitter_url: string
          updated_at: string
          website: string
          year_founded: number | null
        }
        Insert: {
          blockchain: string
          category: string
          coingecko_id?: string | null
          created_at?: string
          description: string
          discord_url?: string
          id?: string
          logo_emoji?: string
          logo_url?: string | null
          name: string
          slug: string
          status?: string
          tagline: string
          token?: string
          twitter_url?: string
          updated_at?: string
          website?: string
          year_founded?: number | null
        }
        Update: {
          blockchain?: string
          category?: string
          coingecko_id?: string | null
          created_at?: string
          description?: string
          discord_url?: string
          id?: string
          logo_emoji?: string
          logo_url?: string | null
          name?: string
          slug?: string
          status?: string
          tagline?: string
          token?: string
          twitter_url?: string
          updated_at?: string
          website?: string
          year_founded?: number | null
        }
        Relationships: []
      }
      rate_limit_state: {
        Row: {
          backoff_minutes: number
          created_at: string
          id: string
          is_rate_limited: boolean
          last_attempt: string | null
          rate_limited_until: string | null
          updated_at: string
        }
        Insert: {
          backoff_minutes?: number
          created_at?: string
          id?: string
          is_rate_limited?: boolean
          last_attempt?: string | null
          rate_limited_until?: string | null
          updated_at?: string
        }
        Update: {
          backoff_minutes?: number
          created_at?: string
          id?: string
          is_rate_limited?: boolean
          last_attempt?: string | null
          rate_limited_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_likes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          created_at: string
          id: string
          reply_text: string
          review_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_text: string
          review_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_text?: string
          review_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          project_id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      spotlight_projects: {
        Row: {
          created_at: string
          display_order: number
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlight_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      token_market_data: {
        Row: {
          created_at: string
          data_source: string
          fully_diluted_valuation: number | null
          id: string
          last_updated: string | null
          market_cap_usd: number | null
          price_change_24h: number | null
          price_usd: number | null
          project_id: string
          sparkline_7d: Json | null
          updated_at: string
          volume_24h: number | null
        }
        Insert: {
          created_at?: string
          data_source?: string
          fully_diluted_valuation?: number | null
          id?: string
          last_updated?: string | null
          market_cap_usd?: number | null
          price_change_24h?: number | null
          price_usd?: number | null
          project_id: string
          sparkline_7d?: Json | null
          updated_at?: string
          volume_24h?: number | null
        }
        Update: {
          created_at?: string
          data_source?: string
          fully_diluted_valuation?: number | null
          id?: string
          last_updated?: string | null
          market_cap_usd?: number | null
          price_change_24h?: number | null
          price_usd?: number | null
          project_id?: string
          sparkline_7d?: Json | null
          updated_at?: string
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_market_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      comparison_type: "standard" | "custom"
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
      app_role: ["admin", "user"],
      comparison_type: ["standard", "custom"],
    },
  },
} as const
