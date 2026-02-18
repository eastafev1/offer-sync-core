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
      commission_credits: {
        Row: {
          agent_id: string
          amount_eur: number
          created_at: string
          deal_id: string
          id: string
          product_id: string
        }
        Insert: {
          agent_id: string
          amount_eur: number
          created_at?: string
          deal_id: string
          id?: string
          product_id: string
        }
        Update: {
          agent_id?: string
          amount_eur?: number
          created_at?: string
          deal_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_credits_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_credits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_overrides: {
        Row: {
          agent_id: string
          commission_eur: number
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          agent_id: string
          commission_eur: number
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          agent_id?: string
          commission_eur?: number
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          admin_note: string | null
          agent_id: string
          amazon_profile_url: string | null
          commission_eur: number | null
          created_at: string
          customer_name: string | null
          customer_paypal: string | null
          customer_telegram: string | null
          hold_id: string | null
          id: string
          order_screenshot_path: string | null
          product_id: string
          review_link: string | null
          review_screenshot_path: string | null
          status: Database["public"]["Enums"]["deal_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          agent_id: string
          amazon_profile_url?: string | null
          commission_eur?: number | null
          created_at?: string
          customer_name?: string | null
          customer_paypal?: string | null
          customer_telegram?: string | null
          hold_id?: string | null
          id?: string
          order_screenshot_path?: string | null
          product_id: string
          review_link?: string | null
          review_screenshot_path?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          agent_id?: string
          amazon_profile_url?: string | null
          commission_eur?: number | null
          created_at?: string
          customer_name?: string | null
          customer_paypal?: string | null
          customer_telegram?: string | null
          hold_id?: string | null
          id?: string
          order_screenshot_path?: string | null
          product_id?: string
          review_link?: string | null
          review_screenshot_path?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      holds: {
        Row: {
          agent_id: string
          created_at: string
          expires_at: string
          extended: boolean
          id: string
          product_id: string
          status: Database["public"]["Enums"]["hold_status"]
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          expires_at: string
          extended?: boolean
          id?: string
          product_id: string
          status?: Database["public"]["Enums"]["hold_status"]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          expires_at?: string
          extended?: boolean
          id?: string
          product_id?: string
          status?: Database["public"]["Enums"]["hold_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holds_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_blocked_agents: {
        Row: {
          agent_id: string
          id: string
          product_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          product_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_blocked_agents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          amazon_url: string | null
          asin: string | null
          commission_eur: number
          created_at: string
          daily_limit: number | null
          end_date: string | null
          id: string
          is_active: boolean
          main_image_url: string | null
          marketplace_country:
            | Database["public"]["Enums"]["country_code"]
            | null
          owner_id: string
          price_eur: number | null
          start_date: string | null
          title: string
          total_qty: number
          updated_at: string
        }
        Insert: {
          amazon_url?: string | null
          asin?: string | null
          commission_eur?: number
          created_at?: string
          daily_limit?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          main_image_url?: string | null
          marketplace_country?:
            | Database["public"]["Enums"]["country_code"]
            | null
          owner_id: string
          price_eur?: number | null
          start_date?: string | null
          title: string
          total_qty?: number
          updated_at?: string
        }
        Update: {
          amazon_url?: string | null
          asin?: string | null
          commission_eur?: number
          created_at?: string
          daily_limit?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          main_image_url?: string | null
          marketplace_country?:
            | Database["public"]["Enums"]["country_code"]
            | null
          owner_id?: string
          price_eur?: number | null
          start_date?: string | null
          title?: string
          total_qty?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          created_at: string
          email: string
          id: string
          name: string
          payment_details: string | null
          paypal: string | null
          recommendations: string | null
          status: Database["public"]["Enums"]["user_status"]
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          payment_details?: string | null
          paypal?: string | null
          recommendations?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          payment_details?: string | null
          paypal?: string | null
          recommendations?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_countries: {
        Row: {
          country: Database["public"]["Enums"]["country_code"]
          id: string
          user_id: string
        }
        Insert: {
          country: Database["public"]["Enums"]["country_code"]
          id?: string
          user_id: string
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"]
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      admin_sales_metrics: {
        Row: {
          country: Database["public"]["Enums"]["country_code"] | null
          deal_count: number | null
          sale_date: string | null
          total_commission_eur: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      convert_hold_to_deal: {
        Args: {
          p_agent_id: string
          p_amazon_profile_url: string
          p_customer_name: string
          p_customer_paypal: string
          p_customer_telegram: string
          p_hold_id: string
          p_order_screenshot_path: string
        }
        Returns: string
      }
      create_hold: {
        Args: { p_agent_id: string; p_product_id: string }
        Returns: string
      }
      expire_stale_holds: { Args: never; Returns: number }
      extend_hold: {
        Args: { p_agent_id: string; p_hold_id: string }
        Returns: undefined
      }
      get_user_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "agent"
      country_code: "ES" | "DE" | "FR" | "IT" | "UK"
      deal_status:
        | "sold_submitted"
        | "review_uploaded"
        | "approved"
        | "rejected"
        | "paid_to_client"
        | "completed"
      hold_status: "active" | "expired" | "converted" | "cancelled"
      user_status: "pending" | "approved" | "blocked"
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
      app_role: ["admin", "seller", "agent"],
      country_code: ["ES", "DE", "FR", "IT", "UK"],
      deal_status: [
        "sold_submitted",
        "review_uploaded",
        "approved",
        "rejected",
        "paid_to_client",
        "completed",
      ],
      hold_status: ["active", "expired", "converted", "cancelled"],
      user_status: ["pending", "approved", "blocked"],
    },
  },
} as const
