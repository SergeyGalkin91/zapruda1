// Generated from designated STAGING yudtbifopfnjtjanaqrd on 2026-11-03.
// This schema snapshot is not evidence of production migration parity.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      ai_daily_advices: {
        Row: {
          advice_day: string;
          answer: string;
          attempts: number;
          created_at: string;
          error_message: string;
          id: string;
          lease_expires_at: string | null;
          lease_token: string | null;
          model: string;
          prompt_summary: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          advice_day: string;
          answer?: string;
          attempts?: number;
          created_at?: string;
          error_message?: string;
          id?: string;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          model?: string;
          prompt_summary?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          advice_day?: string;
          answer?: string;
          attempts?: number;
          created_at?: string;
          error_message?: string;
          id?: string;
          lease_expires_at?: string | null;
          lease_token?: string | null;
          model?: string;
          prompt_summary?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      angler_preferences: {
        Row: {
          favorite_lures: string;
          fishing_access: string;
          fishing_methods: string[];
          fishing_notes: string;
          home_city: string;
          home_country_code: string;
          home_region: string;
          main_technique: string;
          preferred_water: string;
          search_radius_km: number;
          tackle_text: string;
          target_species: string[];
          transport: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          favorite_lures?: string;
          fishing_access?: string;
          fishing_methods?: string[];
          fishing_notes?: string;
          home_city?: string;
          home_country_code?: string;
          home_region?: string;
          main_technique?: string;
          preferred_water?: string;
          search_radius_km?: number;
          tackle_text?: string;
          target_species?: string[];
          transport?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          favorite_lures?: string;
          fishing_access?: string;
          fishing_methods?: string[];
          fishing_notes?: string;
          home_city?: string;
          home_country_code?: string;
          home_region?: string;
          main_technique?: string;
          preferred_water?: string;
          search_radius_km?: number;
          tackle_text?: string;
          target_species?: string[];
          transport?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      club_creation_requests: {
        Row: {
          admin_approved: boolean;
          applicant_id: string;
          city: string;
          created_at: string;
          description: string;
          fee_rub: number;
          id: string;
          name: string;
          payment_reference: string | null;
          reviewed_at: string | null;
          status: string;
        };
        Insert: {
          admin_approved?: boolean;
          applicant_id: string;
          city?: string;
          created_at?: string;
          description?: string;
          fee_rub?: number;
          id?: string;
          name: string;
          payment_reference?: string | null;
          reviewed_at?: string | null;
          status?: string;
        };
        Update: {
          admin_approved?: boolean;
          applicant_id?: string;
          city?: string;
          created_at?: string;
          description?: string;
          fee_rub?: number;
          id?: string;
          name?: string;
          payment_reference?: string | null;
          reviewed_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      club_verified_payments: {
        Row: {
          amount_rub: number;
          provider: string;
          provider_event_id: string;
          recorded_at: string;
          request_id: string;
          verified_at: string;
        };
        Insert: {
          amount_rub: number;
          provider: string;
          provider_event_id: string;
          recorded_at?: string;
          request_id: string;
          verified_at: string;
        };
        Update: {
          amount_rub?: number;
          provider?: string;
          provider_event_id?: string;
          recorded_at?: string;
          request_id?: string;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_verified_payments_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "club_creation_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      competition_results: {
        Row: {
          biggest_fish_g: number;
          competition_id: string;
          created_at: string;
          fish_count: number;
          id: string;
          note: string;
          status: string;
          submitted_by: string;
          team_id: string;
          total_weight_g: number;
        };
        Insert: {
          biggest_fish_g?: number;
          competition_id: string;
          created_at?: string;
          fish_count?: number;
          id?: string;
          note?: string;
          status?: string;
          submitted_by: string;
          team_id: string;
          total_weight_g?: number;
        };
        Update: {
          biggest_fish_g?: number;
          competition_id?: string;
          created_at?: string;
          fish_count?: number;
          id?: string;
          note?: string;
          status?: string;
          submitted_by?: string;
          team_id?: string;
          total_weight_g?: number;
        };
        Relationships: [
          {
            foreignKeyName: "competition_results_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competition_results_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "competition_teams";
            referencedColumns: ["id"];
          },
        ];
      };
      competition_teams: {
        Row: {
          captain_id: string;
          club_id: string | null;
          competition_id: string;
          created_at: string;
          id: string;
          name: string;
          status: string;
        };
        Insert: {
          captain_id: string;
          club_id?: string | null;
          competition_id: string;
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
        };
        Update: {
          captain_id?: string;
          club_id?: string | null;
          competition_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competition_teams_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
        ];
      };
      competitions: {
        Row: {
          area_label: string;
          created_at: string;
          description: string;
          ends_at: string;
          id: string;
          max_teams: number;
          organizer_id: string;
          scoring_mode: string;
          starts_at: string;
          status: string;
          title: string;
        };
        Insert: {
          area_label?: string;
          created_at?: string;
          description?: string;
          ends_at: string;
          id?: string;
          max_teams?: number;
          organizer_id: string;
          scoring_mode?: string;
          starts_at: string;
          status?: string;
          title: string;
        };
        Update: {
          area_label?: string;
          created_at?: string;
          description?: string;
          ends_at?: string;
          id?: string;
          max_teams?: number;
          organizer_id?: string;
          scoring_mode?: string;
          starts_at?: string;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      fishing_reports: {
        Row: {
          air_temperature_c: number | null;
          approximate_latitude: number | null;
          approximate_longitude: number | null;
          body: string | null;
          created_at: string;
          fishing_method: string | null;
          id: string;
          is_public: boolean;
          latitude: number | null;
          location_name: string | null;
          longitude: number | null;
          pressure_hpa: number | null;
          title: string;
          user_id: string;
          water_type: string | null;
          weather_summary: string | null;
          wind_direction: string | null;
          wind_speed_ms: number | null;
        };
        Insert: {
          air_temperature_c?: number | null;
          approximate_latitude?: number | null;
          approximate_longitude?: number | null;
          body?: string | null;
          created_at?: string;
          fishing_method?: string | null;
          id?: string;
          is_public?: boolean;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          pressure_hpa?: number | null;
          title: string;
          user_id: string;
          water_type?: string | null;
          weather_summary?: string | null;
          wind_direction?: string | null;
          wind_speed_ms?: number | null;
        };
        Update: {
          air_temperature_c?: number | null;
          approximate_latitude?: number | null;
          approximate_longitude?: number | null;
          body?: string | null;
          created_at?: string;
          fishing_method?: string | null;
          id?: string;
          is_public?: boolean;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          pressure_hpa?: number | null;
          title?: string;
          user_id?: string;
          water_type?: string | null;
          weather_summary?: string | null;
          wind_direction?: string | null;
          wind_speed_ms?: number | null;
        };
        Relationships: [];
      };
      guide_booking_quotes: {
        Row: {
          commission_bps: number;
          contacts_unlocked_at: string | null;
          created_at: string;
          customer_id: string;
          estimated_commission_rub: number;
          estimated_guide_net_rub: number;
          fixed_price_rub: number;
          guide_id: string;
          paid_at: string | null;
          payment_status: string;
          provider_payment_id: string | null;
          request_id: string;
          trip_id: string;
        };
        Insert: {
          commission_bps: number;
          contacts_unlocked_at?: string | null;
          created_at?: string;
          customer_id: string;
          estimated_commission_rub: number;
          estimated_guide_net_rub: number;
          fixed_price_rub: number;
          guide_id: string;
          paid_at?: string | null;
          payment_status?: string;
          provider_payment_id?: string | null;
          request_id: string;
          trip_id: string;
        };
        Update: {
          commission_bps?: number;
          contacts_unlocked_at?: string | null;
          created_at?: string;
          customer_id?: string;
          estimated_commission_rub?: number;
          estimated_guide_net_rub?: number;
          fixed_price_rub?: number;
          guide_id?: string;
          paid_at?: string | null;
          payment_status?: string;
          provider_payment_id?: string | null;
          request_id?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guide_booking_quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guide_booking_quotes_guide_id_fkey";
            columns: ["guide_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guide_booking_quotes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "partner_trip_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guide_booking_quotes_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "partner_trips";
            referencedColumns: ["id"];
          },
        ];
      };
      guide_profiles: {
        Row: {
          about: string;
          boat_capacity: number | null;
          boat_model: string;
          cancellation_terms: string;
          eligibility_self_attested: boolean;
          experience_years: number | null;
          home_city: string;
          included_gear: string;
          is_active: boolean;
          offers_life_jackets: boolean;
          offers_safety_briefing: boolean;
          service_program: string;
          sonar_model: string;
          specialties: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          about?: string;
          boat_capacity?: number | null;
          boat_model?: string;
          cancellation_terms?: string;
          eligibility_self_attested?: boolean;
          experience_years?: number | null;
          home_city?: string;
          included_gear?: string;
          is_active?: boolean;
          offers_life_jackets?: boolean;
          offers_safety_briefing?: boolean;
          service_program?: string;
          sonar_model?: string;
          specialties?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          about?: string;
          boat_capacity?: number | null;
          boat_model?: string;
          cancellation_terms?: string;
          eligibility_self_attested?: boolean;
          experience_years?: number | null;
          home_city?: string;
          included_gear?: string;
          is_active?: boolean;
          offers_life_jackets?: boolean;
          offers_safety_briefing?: boolean;
          service_program?: string;
          sonar_model?: string;
          specialties?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guide_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      guide_verifications: {
        Row: {
          revoked_at: string | null;
          updated_at: string;
          user_id: string;
          verified_at: string | null;
        };
        Insert: {
          revoked_at?: string | null;
          updated_at?: string;
          user_id: string;
          verified_at?: string | null;
        };
        Update: {
          revoked_at?: string | null;
          updated_at?: string;
          user_id?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guide_verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "guide_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      meetup_members: {
        Row: {
          created_at: string;
          post_id: string;
          role: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          role?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetup_members_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "meetup_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetup_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meetup_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          post_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetup_messages_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "meetup_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetup_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meetup_posts: {
        Row: {
          city_code: string;
          country_code: string;
          created_at: string;
          description: string;
          id: string;
          owner_id: string;
          region_code: string;
          status: string;
          title: string;
        };
        Insert: {
          city_code: string;
          country_code: string;
          created_at?: string;
          description?: string;
          id?: string;
          owner_id: string;
          region_code: string;
          status?: string;
          title: string;
        };
        Update: {
          city_code?: string;
          country_code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          owner_id?: string;
          region_code?: string;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetup_posts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      meetup_private_details: {
        Row: {
          latitude: number | null;
          longitude: number | null;
          meeting_at: string | null;
          owner_id: string;
          post_id: string;
          private_place: string | null;
        };
        Insert: {
          latitude?: number | null;
          longitude?: number | null;
          meeting_at?: string | null;
          owner_id: string;
          post_id: string;
          private_place?: string | null;
        };
        Update: {
          latitude?: number | null;
          longitude?: number | null;
          meeting_at?: string | null;
          owner_id?: string;
          post_id?: string;
          private_place?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meetup_private_details_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetup_private_details_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: true;
            referencedRelation: "meetup_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_trip_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          request_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          request_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          request_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_trip_messages_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "partner_trip_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_trip_requests: {
        Row: {
          applicant_id: string;
          created_at: string;
          id: string;
          note: string;
          status: string;
          trip_id: string;
        };
        Insert: {
          applicant_id: string;
          created_at?: string;
          id?: string;
          note?: string;
          status?: string;
          trip_id: string;
        };
        Update: {
          applicant_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
          status?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_trip_requests_applicant_id_fkey";
            columns: ["applicant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_trip_requests_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "partner_trips";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_trips: {
        Row: {
          boat_type: string;
          cancel_policy: string;
          city: string;
          contribution_rub: number;
          cost_details: string;
          created_at: string;
          departure_at: string;
          description: string;
          destination: string;
          finance_mode: string;
          fishing_method: string;
          gear_included: string;
          guide_experience_years: number | null;
          guide_service: string;
          id: string;
          life_jackets_available: boolean;
          live_sonar_model: string;
          live_sonar_system: string;
          operator_eligibility_confirmed: boolean;
          organizer_id: string;
          platform_commission_bps: number;
          price_includes: string;
          safety_briefing: boolean;
          seats: number;
          sonar_model: string;
          status: string;
          target_fish: string;
          transport: string;
          trip_kind: string;
        };
        Insert: {
          boat_type?: string;
          cancel_policy?: string;
          city: string;
          contribution_rub?: number;
          cost_details?: string;
          created_at?: string;
          departure_at: string;
          description?: string;
          destination: string;
          finance_mode?: string;
          fishing_method?: string;
          gear_included?: string;
          guide_experience_years?: number | null;
          guide_service?: string;
          id?: string;
          life_jackets_available?: boolean;
          live_sonar_model?: string;
          live_sonar_system?: string;
          operator_eligibility_confirmed?: boolean;
          organizer_id: string;
          platform_commission_bps?: number;
          price_includes?: string;
          safety_briefing?: boolean;
          seats?: number;
          sonar_model?: string;
          status?: string;
          target_fish?: string;
          transport?: string;
          trip_kind?: string;
        };
        Update: {
          boat_type?: string;
          cancel_policy?: string;
          city?: string;
          contribution_rub?: number;
          cost_details?: string;
          created_at?: string;
          departure_at?: string;
          description?: string;
          destination?: string;
          finance_mode?: string;
          fishing_method?: string;
          gear_included?: string;
          guide_experience_years?: number | null;
          guide_service?: string;
          id?: string;
          life_jackets_available?: boolean;
          live_sonar_model?: string;
          live_sonar_system?: string;
          operator_eligibility_confirmed?: boolean;
          organizer_id?: string;
          platform_commission_bps?: number;
          price_includes?: string;
          safety_briefing?: boolean;
          seats?: number;
          sonar_model?: string;
          status?: string;
          target_fish?: string;
          transport?: string;
          trip_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_trips_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_symbol: string | null;
          avatar_url: string | null;
          bio: string | null;
          chat_city: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          username: string | null;
        };
        Insert: {
          avatar_symbol?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          chat_city?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          username?: string | null;
        };
        Update: {
          avatar_symbol?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          chat_city?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      reactions: {
        Row: {
          created_at: string;
          id: string;
          reaction_type: string;
          report_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reaction_type?: string;
          report_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reaction_type?: string;
          report_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "fishing_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      report_private_locations: {
        Row: {
          created_at: string;
          latitude: number;
          longitude: number;
          report_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          latitude: number;
          longitude: number;
          report_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          latitude?: number;
          longitude?: number;
          report_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_private_locations_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: true;
            referencedRelation: "fishing_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      social_group_members: {
        Row: {
          created_at: string;
          group_id: string;
          invited_by: string | null;
          role: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          invited_by?: string | null;
          role?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          invited_by?: string | null;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "social_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      social_group_messages: {
        Row: {
          body: string;
          created_at: string;
          group_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          group_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          group_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_group_messages_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "social_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      social_groups: {
        Row: {
          city: string;
          country: string;
          created_at: string;
          description: string;
          id: string;
          interests: string;
          name: string;
          owner_id: string;
          source_request_id: string | null;
        };
        Insert: {
          city?: string;
          country?: string;
          created_at?: string;
          description?: string;
          id?: string;
          interests?: string;
          name: string;
          owner_id: string;
          source_request_id?: string | null;
        };
        Update: {
          city?: string;
          country?: string;
          created_at?: string;
          description?: string;
          id?: string;
          interests?: string;
          name?: string;
          owner_id?: string;
          source_request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_groups_source_request_id_fkey";
            columns: ["source_request_id"];
            isOneToOne: true;
            referencedRelation: "club_creation_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      social_message_reactions: {
        Row: {
          emoji: string;
          id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          emoji: string;
          id?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          emoji?: string;
          id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_message_reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "social_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      social_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          latitude: number | null;
          location_title: string | null;
          longitude: number | null;
          reply_to_id: string | null;
          sender_id: string;
          source_mark_id: string | null;
          thread_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          latitude?: number | null;
          location_title?: string | null;
          longitude?: number | null;
          reply_to_id?: string | null;
          sender_id: string;
          source_mark_id?: string | null;
          thread_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          latitude?: number | null;
          location_title?: string | null;
          longitude?: number | null;
          reply_to_id?: string | null;
          sender_id?: string;
          source_mark_id?: string | null;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_messages_reply_to_id_fkey";
            columns: ["reply_to_id"];
            isOneToOne: false;
            referencedRelation: "social_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "social_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      social_threads: {
        Row: {
          created_at: string;
          id: string;
          recipient_id: string;
          requester_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          recipient_id: string;
          requester_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          recipient_id?: string;
          requester_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_ai_daily_advice_slot: {
        Args: {
          p_advice_day: string;
          p_max_failed?: number;
          p_prompt_summary: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      complete_ai_daily_advice_slot: {
        Args: {
          p_answer?: string;
          p_error_message?: string;
          p_id: string;
          p_lease_token: string;
          p_model?: string;
          p_success: boolean;
        };
        Returns: Json;
      };
      mark_guide_booking_paid_from_provider: {
        Args: {
          p_provider_payment_id: string;
          p_request_id: string;
          p_settlement_confirmed?: boolean;
        };
        Returns: undefined;
      };
      meetup_is_accepted: { Args: { p_post: string }; Returns: boolean };
      meetup_occupancy: { Args: { p_post: string }; Returns: number };
      my_profile_full: {
        Args: never;
        Returns: {
          avatar_symbol: string | null;
          avatar_url: string | null;
          bio: string | null;
          chat_city: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          username: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      provision_verified_paid_club: {
        Args: { p_request_id: string };
        Returns: string;
      };
      staging_provision_paid_club: {
        Args: { p_request_id: string };
        Returns: string;
      };
      toggle_report_reaction_atomic: {
        Args: { p_reaction_type: string; p_report_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
