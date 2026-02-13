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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      affiliate_bonus_numbers: {
        Row: {
          affiliate_id: string
          bonus_numbers: number[]
          created_at: string
          id: string
          raffle_id: string
        }
        Insert: {
          affiliate_id: string
          bonus_numbers: number[]
          created_at?: string
          id?: string
          raffle_id: string
        }
        Update: {
          affiliate_id?: string
          bonus_numbers?: number[]
          created_at?: string
          id?: string
          raffle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_bonus_numbers_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_bonus_numbers_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          raffle_id: string | null
          referred_user_id: string
          status: string
          updated_at: string
          week_start: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          raffle_id?: string | null
          referred_user_id: string
          status?: string
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          raffle_id?: string | null
          referred_user_id?: string
          status?: string
          updated_at?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_code: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_code?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_affiliates_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instant_prizes: {
        Row: {
          claimed: boolean
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          prize_amount: number
          prize_description: string
          raffle_id: string
          ticket_numbers: number[]
          updated_at: string
        }
        Insert: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          prize_amount: number
          prize_description?: string
          raffle_id: string
          ticket_numbers: number[]
          updated_at?: string
        }
        Update: {
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          prize_amount?: number
          prize_description?: string
          raffle_id?: string
          ticket_numbers?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      lottery_settings: {
        Row: {
          banner_url: string | null
          draw_time: string
          id: string
          is_auto_draw_enabled: boolean | null
          prize_percentage_4: number
          prize_percentage_5: number
          prize_percentage_6: number
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          draw_time?: string
          id?: string
          is_auto_draw_enabled?: boolean | null
          prize_percentage_4?: number
          prize_percentage_5?: number
          prize_percentage_6?: number
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          draw_time?: string
          id?: string
          is_auto_draw_enabled?: boolean | null
          prize_percentage_4?: number
          prize_percentage_5?: number
          prize_percentage_6?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_affiliate_winners: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          month_year: string
          paid_at: string | null
          prize_amount: number
          referrals_count: number
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          month_year: string
          paid_at?: string | null
          prize_amount?: number
          referrals_count?: number
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          month_year?: string
          paid_at?: string | null
          prize_amount?: number
          referrals_count?: number
        }
        Relationships: []
      }
      palpiteco_settings: {
        Row: {
          banner_url: string | null
          id: string
          platform_percentage: number
          updated_at: string | null
          winners_percentage: number
        }
        Insert: {
          banner_url?: string | null
          id?: string
          platform_percentage?: number
          updated_at?: string | null
          winners_percentage?: number
        }
        Update: {
          banner_url?: string | null
          id?: string
          platform_percentage?: number
          updated_at?: string | null
          winners_percentage?: number
        }
        Relationships: []
      }
      pix_payments: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          paggue_transaction_id: string | null
          paggue_webhook_data: Json | null
          paid_at: string | null
          pix_code: string | null
          qr_code_image: string | null
          raffle_id: string
          selected_numbers: number[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          paggue_transaction_id?: string | null
          paggue_webhook_data?: Json | null
          paid_at?: string | null
          pix_code?: string | null
          qr_code_image?: string | null
          raffle_id: string
          selected_numbers: number[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          paggue_transaction_id?: string | null
          paggue_webhook_data?: Json | null
          paid_at?: string | null
          pix_code?: string | null
          qr_code_image?: string | null
          raffle_id?: string
          selected_numbers?: number[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_entries: {
        Row: {
          created_at: string
          id: string
          payment_status: string
          pix_payment_id: string | null
          poll_id: string
          selected_option: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_status?: string
          pix_payment_id?: string | null
          poll_id: string
          selected_option: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_status?: string
          pix_payment_id?: string | null
          poll_id?: string
          selected_option?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_entries_pix_payment_id_fkey"
            columns: ["pix_payment_id"]
            isOneToOne: false
            referencedRelation: "pix_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_entries_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          category: string | null
          created_at: string
          entry_price: number
          id: string
          options: Json
          prize_amount: number
          question: string | null
          status: string
          title: string
          updated_at: string
          winning_option: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          options?: Json
          prize_amount?: number
          question?: string | null
          status?: string
          title: string
          updated_at?: string
          winning_option?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          options?: Json
          prize_amount?: number
          question?: string | null
          status?: string
          title?: string
          updated_at?: string
          winning_option?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          pix_key: string | null
          referred_by: string | null
          role: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          pix_key?: string | null
          referred_by?: string | null
          role?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          pix_key?: string | null
          referred_by?: string | null
          role?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      raffle_bets: {
        Row: {
          created_at: string | null
          id: string
          numbers: number[]
          raffle_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          numbers: number[]
          raffle_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          numbers?: number[]
          raffle_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_bets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_tickets: {
        Row: {
          created_at: string
          id: string
          payment_status: string
          raffle_id: string
          ticket_number: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_status?: string
          raffle_id: string
          ticket_number: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_status?: string
          raffle_id?: string
          ticket_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_tickets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_winners: {
        Row: {
          bet_numbers: number[] | null
          created_at: string | null
          id: string
          matches: number
          prize_amount: number
          raffle_id: string
          user_id: string
        }
        Insert: {
          bet_numbers?: number[] | null
          created_at?: string | null
          id?: string
          matches: number
          prize_amount: number
          raffle_id: string
          user_id: string
        }
        Update: {
          bet_numbers?: number[] | null
          created_at?: string | null
          id?: string
          matches?: number
          prize_amount?: number
          raffle_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_winners_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          auto_start_next: boolean | null
          campaign_end_date: string | null
          campaign_start_date: string | null
          created_at: string
          description: string | null
          draw_date: string
          drawn_numbers: number[] | null
          id: string
          prize_value: number
          status: string
          ticket_price: number
          title: string
          total_tickets: number
          updated_at: string
          winner_video_title: string | null
          winner_video_url: string | null
          winning_number: number | null
        }
        Insert: {
          auto_start_next?: boolean | null
          campaign_end_date?: string | null
          campaign_start_date?: string | null
          created_at?: string
          description?: string | null
          draw_date: string
          drawn_numbers?: number[] | null
          id?: string
          prize_value: number
          status?: string
          ticket_price?: number
          title: string
          total_tickets?: number
          updated_at?: string
          winner_video_title?: string | null
          winner_video_url?: string | null
          winning_number?: number | null
        }
        Update: {
          auto_start_next?: boolean | null
          campaign_end_date?: string | null
          campaign_start_date?: string | null
          created_at?: string
          description?: string | null
          draw_date?: string
          drawn_numbers?: number[] | null
          id?: string
          prize_value?: number
          status?: string
          ticket_price?: number
          title?: string
          total_tickets?: number
          updated_at?: string
          winner_video_title?: string | null
          winner_video_url?: string | null
          winning_number?: number | null
        }
        Relationships: []
      }
      weekly_affiliate_winners: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          paid_at: string | null
          prize_amount: number
          referrals_count: number
          week_end: string
          week_start: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          prize_amount?: number
          referrals_count?: number
          week_end: string
          week_start: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          prize_amount?: number
          referrals_count?: number
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_affiliate_winners_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fix_historical_affiliate_data: {
        Args: never
        Returns: {
          action_type: string
          affiliate_code: string
          message: string
          user_id: string
        }[]
      }
      generate_affiliate_code: { Args: never; Returns: string }
      get_active_raffle: { Args: never; Returns: string }
      get_affiliate_rankings: {
        Args: never
        Returns: {
          affiliate_code: string
          affiliate_id: string
          first_referral_date: string
          full_name: string
          referrals_count: number
        }[]
      }
      get_current_user_role: { Args: never; Returns: string }
      process_affiliate_referral: {
        Args: { p_affiliate_code: string; p_referred_user_id: string }
        Returns: boolean
      }
      reserve_numbers: {
        Args: { p_numbers: number[]; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
