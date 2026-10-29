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
          fishing_method: string | null
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
          fishing_method?: string | null
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
          fishing_method?: string | null
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
          experience_needed: string
          social_style: string
          duration_hours: number | null
          meeting_area: string
          gear_requirements: string
          safety_notes: string
          boat_trip: boolean
          trip_kind: "community" | "guided"
          guide_service: string
          boat_type: string
          sonar_model: string
          gear_included: string
          price_includes: string
          cancel_policy: string
          guide_experience_years: number | null
          safety_briefing: boolean
          life_jackets_available: boolean
          operator_eligibility_confirmed: boolean
          platform_commission_bps: number
          live_sonar_system: string
          live_sonar_model: string
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
          experience_needed?: string
          social_style?: string
          duration_hours?: number | null
          meeting_area?: string
          gear_requirements?: string
          safety_notes?: string
          boat_trip?: boolean
          trip_kind?: "community" | "guided"
          guide_service?: string
          boat_type?: string
          sonar_model?: string
          gear_included?: string
          price_includes?: string
          cancel_policy?: string
          guide_experience_years?: number | null
          safety_briefing?: boolean
          life_jackets_available?: boolean
          operator_eligibility_confirmed?: boolean
          platform_commission_bps?: number
          live_sonar_system?: string
          live_sonar_model?: string
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
          experience_needed?: string
          social_style?: string
          duration_hours?: number | null
          meeting_area?: string
          gear_requirements?: string
          safety_notes?: string
          boat_trip?: boolean
          trip_kind?: "community" | "guided"
          guide_service?: string
          boat_type?: string
          sonar_model?: string
          gear_included?: string
          price_includes?: string
          cancel_policy?: string
          guide_experience_years?: number | null
          safety_briefing?: boolean
          life_jackets_available?: boolean
          operator_eligibility_confirmed?: boolean
          platform_commission_bps?: number
          live_sonar_system?: string
          live_sonar_model?: string
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
      angler_gear: {
        Row: {
          id: string
          user_id: string
          gear_type: string
          brand: string
          model: string
          variant: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gear_type: string
          brand: string
          model: string
          variant?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gear_type?: string
          brand?: string
          model?: string
          variant?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "angler_gear_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_requests: {
        Row: {
          id: string
          user_id: string
          request_type: "improvement" | "cooperation" | "bug"
          category: string
          subject: string
          body: string
          contact: string
          review_status: "new" | "in_review" | "resolved" | "closed"
          telegram_status: "pending" | "sent" | "failed"
          telegram_attempts: number
          telegram_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          request_type: "improvement" | "cooperation" | "bug"
          category?: string
          subject: string
          body: string
          contact?: string
          review_status?: "new" | "in_review" | "resolved" | "closed"
          telegram_status?: "pending" | "sent" | "failed"
          telegram_attempts?: number
          telegram_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          request_type?: "improvement" | "cooperation" | "bug"
          category?: string
          subject?: string
          body?: string
          contact?: string
          review_status?: "new" | "in_review" | "resolved" | "closed"
          telegram_status?: "pending" | "sent" | "failed"
          telegram_attempts?: number
          telegram_sent_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      angler_preferences: {
        Row: {
          user_id: string
          home_city: string
          home_region: string
          main_technique: string
          target_species: string[]
          fishing_access: string
          transport: string
          favorite_lures: string
          tackle_text: string
          preferred_water: string
          fishing_notes: string
          search_radius_km: number
          updated_at: string
        }
        Insert: {
          user_id: string
          home_city?: string
          home_region?: string
          main_technique?: string
          target_species?: string[]
          fishing_access?: string
          transport?: string
          favorite_lures?: string
          tackle_text?: string
          preferred_water?: string
          fishing_notes?: string
          search_radius_km?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          home_city?: string
          home_region?: string
          main_technique?: string
          target_species?: string[]
          fishing_access?: string
          transport?: string
          favorite_lures?: string
          tackle_text?: string
          preferred_water?: string
          fishing_notes?: string
          search_radius_km?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "angler_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memberships: {
        Row: {
          user_id: string
          active_until: string
          updated_at: string
          payment_reference: string | null
        }
        Insert: {
          user_id: string
          active_until: string
          updated_at?: string
          payment_reference?: string | null
        }
        Update: {
          user_id?: string
          active_until?: string
          updated_at?: string
          payment_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_profiles: {
        Row: {
          user_id: string
          title: string
          home_city: string
          about: string
          specialties: string
          experience_years: number | null
          boat_model: string
          boat_capacity: number | null
          sonar_model: string
          included_gear: string
          service_program: string
          cancellation_terms: string
          offers_safety_briefing: boolean
          offers_life_jackets: boolean
          eligibility_self_attested: boolean
          is_active: boolean
          updated_at: string
          live_sonar_system: string
          live_sonar_model: string
        }
        Insert: {
          user_id: string
          title?: string
          home_city?: string
          about?: string
          specialties?: string
          experience_years?: number | null
          boat_model?: string
          boat_capacity?: number | null
          sonar_model?: string
          included_gear?: string
          service_program?: string
          cancellation_terms?: string
          offers_safety_briefing?: boolean
          offers_life_jackets?: boolean
          eligibility_self_attested?: boolean
          is_active?: boolean
          updated_at?: string
          live_sonar_system?: string
          live_sonar_model?: string
        }
        Update: {
          user_id?: string
          title?: string
          home_city?: string
          about?: string
          specialties?: string
          experience_years?: number | null
          boat_model?: string
          boat_capacity?: number | null
          sonar_model?: string
          included_gear?: string
          service_program?: string
          cancellation_terms?: string
          offers_safety_briefing?: boolean
          offers_life_jackets?: boolean
          eligibility_self_attested?: boolean
          is_active?: boolean
          updated_at?: string
          live_sonar_system?: string
          live_sonar_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_verifications: {
        Row: {
          user_id: string
          verified_at: string | null
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          verified_at?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          verified_at?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "guide_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      guide_booking_quotes: {
        Row: {
          request_id: string
          trip_id: string
          guide_id: string
          customer_id: string
          fixed_price_rub: number
          commission_bps: number
          estimated_commission_rub: number
          estimated_guide_net_rub: number
          payment_status: string
          created_at: string
          paid_at: string | null
        }
        Insert: {
          request_id: string
          trip_id: string
          guide_id: string
          customer_id: string
          fixed_price_rub: number
          commission_bps: number
          estimated_commission_rub: number
          estimated_guide_net_rub: number
          payment_status?: string
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          request_id?: string
          trip_id?: string
          guide_id?: string
          customer_id?: string
          fixed_price_rub?: number
          commission_bps?: number
          estimated_commission_rub?: number
          estimated_guide_net_rub?: number
          payment_status?: string
          created_at?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_booking_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "partner_trip_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      spearfishing_profiles: {
        Row: {
          user_id: string
          home_city: string
          preferred_waters: string
          experience_years: number | null
          activity_style: string
          access_type: string
          equipment_overview: string
          buddy_notes: string
          safety_training_self_reported: boolean
          buddy_only: boolean
          publicly_listed: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          home_city?: string
          preferred_waters?: string
          experience_years?: number | null
          activity_style?: string
          access_type?: string
          equipment_overview?: string
          buddy_notes?: string
          safety_training_self_reported?: boolean
          buddy_only?: boolean
          publicly_listed?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          home_city?: string
          preferred_waters?: string
          experience_years?: number | null
          activity_style?: string
          access_type?: string
          equipment_overview?: string
          buddy_notes?: string
          safety_training_self_reported?: boolean
          buddy_only?: boolean
          publicly_listed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spearfishing_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_user_blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: [
        ]
      }
      partner_user_reports: {
        Row: {
          id: string
          reporter_id: string
          reported_id: string
          trip_id: string | null
          reason: string
          details: string
          review_status: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_id: string
          trip_id?: string | null
          reason: string
          details?: string
          review_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_id?: string
          trip_id?: string | null
          reason?: string
          details?: string
          review_status?: string
          created_at?: string
        }
        Relationships: [
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
      my_fishing_specializations: {
        Args: Record<PropertyKey, never>
        Returns: {
          fishing_method: string
          report_count: number
          catches_count: number
          credited_catches: number
          photo_reports: number
          distinct_waters: number
          heaviest_catch_kg: number | null
        }[]
      }
      my_fishing_progress: {
        Args: Record<PropertyKey, never>
        Returns: {
          report_count: number
          catches_count: number
          photo_count: number
          photo_reports: number
          reactions_received: number
          trips_organized: number
          heaviest_catch_kg: number | null
        }[]
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
