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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      catches: {
        Row: {
          created_at: string
          id: string
          length_cm: number | null
          lure: string | null
          photo_url: string | null
          report_id: string
          species: string
          technique: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          length_cm?: number | null
          lure?: string | null
          photo_url?: string | null
          report_id: string
          species: string
          technique?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          length_cm?: number | null
          lure?: string | null
          photo_url?: string | null
          report_id?: string
          species?: string
          technique?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catches_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fishing_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fishing_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fishing_reports: {
        Row: {
          air_temperature_c: number | null
          approximate_latitude: number | null
          approximate_longitude: number | null
          body: string | null
          created_at: string
          id: string
          is_public: boolean
          location_name: string | null
          pressure_hpa: number | null
          title: string
          user_id: string
          water_type: string | null
          weather_summary: string | null
          wind_direction: string | null
          wind_speed_ms: number | null
        }
        Insert: {
          air_temperature_c?: number | null
          approximate_latitude?: number | null
          approximate_longitude?: number | null
          body?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          location_name?: string | null
          pressure_hpa?: number | null
          title: string
          user_id: string
          water_type?: string | null
          weather_summary?: string | null
          wind_direction?: string | null
          wind_speed_ms?: number | null
        }
        Update: {
          air_temperature_c?: number | null
          approximate_latitude?: number | null
          approximate_longitude?: number | null
          body?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          location_name?: string | null
          pressure_hpa?: number | null
          title?: string
          user_id?: string
          water_type?: string | null
          weather_summary?: string | null
          wind_direction?: string | null
          wind_speed_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fishing_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fishing_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          id: string
          report_id: string
          user_id: string
          storage_path: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          storage_path: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          storage_path?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "fishing_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trips: {
        Row: {
          id: string
          organizer_id: string
          city: string
          destination: string
          departure_at: string
          fishing_method: string
          target_fish: string
          transport: string
          seats: number
          finance_mode: "free" | "split" | "fee"
          contribution_rub: number
          cost_details: string
          description: string
          status: "open" | "closed"
          created_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          city: string
          destination: string
          departure_at: string
          fishing_method?: string
          target_fish?: string
          transport?: string
          seats?: number
          finance_mode?: "free" | "split" | "fee"
          contribution_rub?: number
          cost_details?: string
          description?: string
          status?: "open" | "closed"
          created_at?: string
        }
        Update: {
          id?: string
          organizer_id?: string
          city?: string
          destination?: string
          departure_at?: string
          fishing_method?: string
          target_fish?: string
          transport?: string
          seats?: number
          finance_mode?: "free" | "split" | "fee"
          contribution_rub?: number
          cost_details?: string
          description?: string
          status?: "open" | "closed"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_trips_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trip_requests: {
        Row: {
          id: string
          trip_id: string
          applicant_id: string
          note: string
          status: "pending" | "accepted" | "declined" | "withdrawn"
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          applicant_id: string
          note?: string
          status?: "pending" | "accepted" | "declined" | "withdrawn"
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          applicant_id?: string
          note?: string
          status?: "pending" | "accepted" | "declined" | "withdrawn"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_trip_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "partner_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trip_requests_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trip_messages: {
        Row: {
          id: string
          request_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          sender_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          sender_id?: string
          body?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_trip_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "partner_trip_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trip_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_private_locations: {
        Row: {
          created_at: string
          latitude: number
          longitude: number
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          latitude: number
          longitude: number
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          latitude?: number
          longitude?: number
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_private_locations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "fishing_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_private_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
