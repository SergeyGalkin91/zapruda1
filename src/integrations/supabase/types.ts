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
      admin_email_notifications: {
        Row: {
          attempts: number
          body: string
          created_at: string
          delivery_status: string
          event_type: string
          id: number
          last_error: string | null
          recipient: string
          sent_at: string | null
          source_id: string
          source_table: string
          subject: string
        }
        Insert: {
          attempts?: number
          body: string
          created_at?: string
          delivery_status?: string
          event_type: string
          id?: never
          last_error?: string | null
          recipient?: string
          sent_at?: string | null
          source_id: string
          source_table: string
          subject: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          delivery_status?: string
          event_type?: string
          id?: never
          last_error?: string | null
          recipient?: string
          sent_at?: string | null
          source_id?: string
          source_table?: string
          subject?: string
        }
        Relationships: []
      }
      admin_inbox_submissions: {
        Row: {
          body: string
          category: string
          company: string
          consent_to_contact: boolean
          contact: string
          created_at: string
          delivery_status: string
          id: string
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          company?: string
          consent_to_contact?: boolean
          contact?: string
          created_at?: string
          delivery_status?: string
          id?: string
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          company?: string
          consent_to_contact?: boolean
          contact?: string
          created_at?: string
          delivery_status?: string
          id?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_inbox_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_inbox_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_daily_advices: {
        Row: {
          advice_day: string
          answer: string
          attempts: number
          created_at: string
          id: string
          prompt_summary: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advice_day: string
          answer?: string
          attempts?: number
          created_at?: string
          id?: string
          prompt_summary?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advice_day?: string
          answer?: string
          attempts?: number
          created_at?: string
          id?: string
          prompt_summary?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_daily_advices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_daily_advices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memberships: {
        Row: {
          active_until: string
          payment_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_until: string
          payment_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_until?: string
          payment_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_spot_analysis_usage: {
        Row: {
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_spot_analysis_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_spot_analysis_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      angler_gear: {
        Row: {
          brand: string
          created_at: string
          gear_type: string
          id: string
          model: string
          notes: string
          updated_at: string
          user_id: string
          variant: string
        }
        Insert: {
          brand: string
          created_at?: string
          gear_type: string
          id?: string
          model: string
          notes?: string
          updated_at?: string
          user_id: string
          variant?: string
        }
        Update: {
          brand?: string
          created_at?: string
          gear_type?: string
          id?: string
          model?: string
          notes?: string
          updated_at?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "angler_gear_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "angler_gear_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      angler_gear_sets: {
        Row: {
          created_at: string
          fishing_method: string
          id: string
          is_primary: boolean
          line_id: string | null
          notes: string
          reel_id: string
          rod_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fishing_method?: string
          id?: string
          is_primary?: boolean
          line_id?: string | null
          notes?: string
          reel_id: string
          rod_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fishing_method?: string
          id?: string
          is_primary?: boolean
          line_id?: string | null
          notes?: string
          reel_id?: string
          rod_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "angler_gear_sets_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "angler_gear"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angler_gear_sets_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "angler_gear"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angler_gear_sets_rod_id_fkey"
            columns: ["rod_id"]
            isOneToOne: false
            referencedRelation: "angler_gear"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "angler_gear_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "angler_gear_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      angler_preferences: {
        Row: {
          favorite_lures: string
          fishing_access: string
          fishing_methods: string[]
          fishing_notes: string
          home_city: string
          home_country_code: string
          home_region: string
          main_technique: string
          preferred_water: string
          search_radius_km: number
          tackle_text: string
          target_species: string[]
          transport: string
          updated_at: string
          user_id: string
        }
        Insert: {
          favorite_lures?: string
          fishing_access?: string
          fishing_methods?: string[]
          fishing_notes?: string
          home_city?: string
          home_country_code?: string
          home_region?: string
          main_technique?: string
          preferred_water?: string
          search_radius_km?: number
          tackle_text?: string
          target_species?: string[]
          transport?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          favorite_lures?: string
          fishing_access?: string
          fishing_methods?: string[]
          fishing_notes?: string
          home_city?: string
          home_country_code?: string
          home_region?: string
          main_technique?: string
          preferred_water?: string
          search_radius_km?: number
          tackle_text?: string
          target_species?: string[]
          transport?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "angler_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "angler_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      angler_reviews: {
        Row: {
          author_id: string
          body: string
          context: string
          created_at: string
          id: string
          source_id: string
          stars: number
          target_id: string
        }
        Insert: {
          author_id: string
          body: string
          context: string
          created_at?: string
          id?: string
          source_id: string
          stars: number
          target_id: string
        }
        Update: {
          author_id?: string
          body?: string
          context?: string
          created_at?: string
          id?: string
          source_id?: string
          stars?: number
          target_id?: string
        }
        Relationships: []
      }
      atlas_catch_claims: {
        Row: {
          catch_id: string
          created_at: string
          evidence_photo_id: string
          id: string
          reviewed_at: string | null
          reviewer_note: string
          species_id: string
          status: string
          user_id: string
          waterbody_id: string
        }
        Insert: {
          catch_id: string
          created_at?: string
          evidence_photo_id: string
          id?: string
          reviewed_at?: string | null
          reviewer_note?: string
          species_id: string
          status?: string
          user_id: string
          waterbody_id: string
        }
        Update: {
          catch_id?: string
          created_at?: string
          evidence_photo_id?: string
          id?: string
          reviewed_at?: string | null
          reviewer_note?: string
          species_id?: string
          status?: string
          user_id?: string
          waterbody_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_catch_claims_catch_id_fkey"
            columns: ["catch_id"]
            isOneToOne: true
            referencedRelation: "catches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_catch_claims_evidence_photo_id_fkey"
            columns: ["evidence_photo_id"]
            isOneToOne: false
            referencedRelation: "report_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_catch_claims_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "atlas_fish_species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_catch_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "atlas_catch_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_catch_claims_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "atlas_waterbodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_catch_claims_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "my_atlas_progress"
            referencedColumns: ["waterbody_id"]
          },
        ]
      }
      atlas_fish_species: {
        Row: {
          code: string
          description: string
          id: string
          name: string
        }
        Insert: {
          code: string
          description?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      atlas_waterbodies: {
        Row: {
          country_code: string
          created_at: string
          id: string
          is_published: boolean
          kind: string
          name: string
          region: string
          slug: string
          source_note: string
          summary: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          is_published?: boolean
          kind: string
          name: string
          region?: string
          slug: string
          source_note?: string
          summary?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          is_published?: boolean
          kind?: string
          name?: string
          region?: string
          slug?: string
          source_note?: string
          summary?: string
        }
        Relationships: []
      }
      atlas_waterbody_species: {
        Row: {
          evidence_status: string
          note: string
          species_id: string
          waterbody_id: string
        }
        Insert: {
          evidence_status?: string
          note?: string
          species_id: string
          waterbody_id: string
        }
        Update: {
          evidence_status?: string
          note?: string
          species_id?: string
          waterbody_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_waterbody_species_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "atlas_fish_species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_waterbody_species_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "atlas_waterbodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_waterbody_species_waterbody_id_fkey"
            columns: ["waterbody_id"]
            isOneToOne: false
            referencedRelation: "my_atlas_progress"
            referencedColumns: ["waterbody_id"]
          },
        ]
      }
      beta_test_applications: {
        Row: {
          created_at: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_test_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "beta_test_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
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
      chat_message_photos: {
        Row: {
          created_at: string
          id: string
          message_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_photos_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          place_id: string
          reply_to_id: string | null
          topic: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          place_id?: string
          reply_to_id?: string | null
          topic?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          place_id?: string
          reply_to_id?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "chat_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_places: {
        Row: {
          country_code: string | null
          created_at: string
          created_by: string | null
          id: string
          level: string
          name: string
          parent_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level: string
          name: string
          parent_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_places_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chat_places"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_creation_requests: {
        Row: {
          admin_approved: boolean
          applicant_id: string
          city: string
          created_at: string
          description: string
          fee_rub: number
          id: string
          name: string
          payment_reference: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          admin_approved?: boolean
          applicant_id: string
          city?: string
          created_at?: string
          description?: string
          fee_rub?: number
          id?: string
          name: string
          payment_reference?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          admin_approved?: boolean
          applicant_id?: string
          city?: string
          created_at?: string
          description?: string
          fee_rub?: number
          id?: string
          name?: string
          payment_reference?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_creation_requests_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "club_creation_requests_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
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
      community_feedback: {
        Row: {
          category: string
          contact: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          telegram_status: string
          user_id: string
        }
        Insert: {
          category: string
          contact?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          telegram_status?: string
          user_id: string
        }
        Update: {
          category?: string
          contact?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          telegram_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "community_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_requests: {
        Row: {
          body: string
          category: string
          contact: string
          created_at: string
          id: string
          request_type: string
          review_status: string
          subject: string
          telegram_attempts: number
          telegram_sent_at: string | null
          telegram_status: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          contact?: string
          created_at?: string
          id?: string
          request_type: string
          review_status?: string
          subject: string
          telegram_attempts?: number
          telegram_sent_at?: string | null
          telegram_status?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          contact?: string
          created_at?: string
          id?: string
          request_type?: string
          review_status?: string
          subject?: string
          telegram_attempts?: number
          telegram_sent_at?: string | null
          telegram_status?: string
          user_id?: string
        }
        Relationships: []
      }
      depth_measurements: {
        Row: {
          created_at: string
          depth_m: number
          id: string
          latitude: number
          longitude: number
          measured_at: string
          note: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          depth_m: number
          id?: string
          latitude: number
          longitude: number
          measured_at?: string
          note?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          depth_m?: number
          id?: string
          latitude?: number
          longitude?: number
          measured_at?: string
          note?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      fishing_map_marks: {
        Row: {
          created_at: string
          fish_species: string
          id: string
          kind: string
          latitude: number
          longitude: number
          note: string
          photo_path: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          fish_species?: string
          id?: string
          kind: string
          latitude: number
          longitude: number
          note?: string
          photo_path?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          fish_species?: string
          id?: string
          kind?: string
          latitude?: number
          longitude?: number
          note?: string
          photo_path?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      fishing_reports: {
        Row: {
          air_temperature_c: number | null
          approximate_latitude: number | null
          approximate_longitude: number | null
          body: string | null
          created_at: string
          fishing_method: string | null
          id: string
          is_public: boolean
          latitude: number | null
          location_name: string | null
          longitude: number | null
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
          fishing_method?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
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
          fishing_method?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fishing_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fishing_session_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fishing_session_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "fishing_session_posts"
            referencedColumns: ["session_id"]
          },
        ]
      }
      fishing_session_posts: {
        Row: {
          author_id: string
          created_at: string
          description: string
          session_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string
          session_id: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string
          session_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "fishing_session_posts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "fishing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      fishing_session_reactions: {
        Row: {
          created_at: string
          emoji: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fishing_session_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "fishing_session_posts"
            referencedColumns: ["session_id"]
          },
        ]
      }
      fishing_sessions: {
        Row: {
          active_seconds: number
          created_at: string
          finished_at: string | null
          id: string
          running_since: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          active_seconds?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          running_since?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          active_seconds?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          running_since?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
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
      guide_booking_inquiries: {
        Row: {
          agreement_terms: string
          amount_rub: number | null
          commission_rub: number | null
          created_at: string
          customer_id: string
          customer_note: string
          guide_id: string
          guide_net_rub: number | null
          id: string
          meeting_text: string
          paid_at: string | null
          payment_method: string | null
          planned_at: string
          provider: string | null
          provider_payment_id: string | null
          service_mode: string
          status: string
          updated_at: string
        }
        Insert: {
          agreement_terms?: string
          amount_rub?: number | null
          commission_rub?: number | null
          created_at?: string
          customer_id: string
          customer_note?: string
          guide_id: string
          guide_net_rub?: number | null
          id?: string
          meeting_text: string
          paid_at?: string | null
          payment_method?: string | null
          planned_at: string
          provider?: string | null
          provider_payment_id?: string | null
          service_mode: string
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_terms?: string
          amount_rub?: number | null
          commission_rub?: number | null
          created_at?: string
          customer_id?: string
          customer_note?: string
          guide_id?: string
          guide_net_rub?: number | null
          id?: string
          meeting_text?: string
          paid_at?: string | null
          payment_method?: string | null
          planned_at?: string
          provider?: string | null
          provider_payment_id?: string | null
          service_mode?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_booking_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_booking_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_booking_inquiries_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guide_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_booking_inquiries_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "verified_guide_list"
            referencedColumns: ["user_id"]
          },
        ]
      }
      guide_booking_quotes: {
        Row: {
          commission_bps: number
          created_at: string
          customer_id: string
          estimated_commission_rub: number
          estimated_guide_net_rub: number
          fixed_price_rub: number
          guide_id: string
          paid_at: string | null
          payment_status: string
          request_id: string
          trip_id: string
        }
        Insert: {
          commission_bps: number
          created_at?: string
          customer_id: string
          estimated_commission_rub: number
          estimated_guide_net_rub: number
          fixed_price_rub: number
          guide_id: string
          paid_at?: string | null
          payment_status?: string
          request_id: string
          trip_id: string
        }
        Update: {
          commission_bps?: number
          created_at?: string
          customer_id?: string
          estimated_commission_rub?: number
          estimated_guide_net_rub?: number
          fixed_price_rub?: number
          guide_id?: string
          paid_at?: string | null
          payment_status?: string
          request_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_booking_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_booking_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_booking_quotes_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_booking_quotes_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_booking_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "partner_trip_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_booking_quotes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "partner_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_profiles: {
        Row: {
          about: string
          boat_capacity: number | null
          boat_model: string
          cancellation_terms: string
          eligibility_self_attested: boolean
          experience_years: number | null
          home_city: string
          included_gear: string
          is_active: boolean
          live_sonar_model: string
          live_sonar_system: string
          meeting_area: string
          meeting_lat: number | null
          meeting_lon: number | null
          offers_life_jackets: boolean
          offers_safety_briefing: boolean
          service_mode: string
          service_program: string
          sonar_model: string
          specialties: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string
          boat_capacity?: number | null
          boat_model?: string
          cancellation_terms?: string
          eligibility_self_attested?: boolean
          experience_years?: number | null
          home_city?: string
          included_gear?: string
          is_active?: boolean
          live_sonar_model?: string
          live_sonar_system?: string
          meeting_area?: string
          meeting_lat?: number | null
          meeting_lon?: number | null
          offers_life_jackets?: boolean
          offers_safety_briefing?: boolean
          service_mode?: string
          service_program?: string
          sonar_model?: string
          specialties?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string
          boat_capacity?: number | null
          boat_model?: string
          cancellation_terms?: string
          eligibility_self_attested?: boolean
          experience_years?: number | null
          home_city?: string
          included_gear?: string
          is_active?: boolean
          live_sonar_model?: string
          live_sonar_system?: string
          meeting_area?: string
          meeting_lat?: number | null
          meeting_lon?: number | null
          offers_life_jackets?: boolean
          offers_safety_briefing?: boolean
          service_mode?: string
          service_program?: string
          sonar_model?: string
          specialties?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_verification_applications: {
        Row: {
          boat_document_note: string
          evidence_path: string
          experience_details: string
          legal_name: string
          phone_contact: string
          reviewed_at: string | null
          reviewer_note: string
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          boat_document_note?: string
          evidence_path?: string
          experience_details?: string
          legal_name: string
          phone_contact: string
          reviewed_at?: string | null
          reviewer_note?: string
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          boat_document_note?: string
          evidence_path?: string
          experience_details?: string
          legal_name?: string
          phone_contact?: string
          reviewed_at?: string | null
          reviewer_note?: string
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_verification_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_verification_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_verifications: {
        Row: {
          revoked_at: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          revoked_at?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "guide_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "verified_guide_list"
            referencedColumns: ["user_id"]
          },
        ]
      }
      partner_reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
          trip_request_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          rating: number
          reviewed_id: string
          reviewer_id: string
          trip_request_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
          trip_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_reviews_trip_request_id_fkey"
            columns: ["trip_request_id"]
            isOneToOne: false
            referencedRelation: "partner_trip_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trip_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
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
      partner_trip_requests: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          note: string
          status: string
          trip_id: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          note?: string
          status?: string
          trip_id: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          note?: string
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_trip_requests_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_trip_requests_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trip_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "partner_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trips: {
        Row: {
          boat_trip: boolean
          boat_type: string
          cancel_policy: string
          city: string
          contribution_rub: number
          cost_details: string
          created_at: string
          departure_at: string
          description: string
          destination: string
          duration_hours: number | null
          experience_needed: string
          finance_mode: string
          fishing_method: string
          gear_included: string
          gear_requirements: string
          guide_experience_years: number | null
          guide_service: string
          id: string
          life_jackets_available: boolean
          live_sonar_model: string
          live_sonar_system: string
          meeting_area: string
          operator_eligibility_confirmed: boolean
          organizer_id: string
          platform_commission_bps: number
          price_includes: string
          safety_briefing: boolean
          safety_notes: string
          seats: number
          social_style: string
          sonar_model: string
          status: string
          target_fish: string
          transport: string
          trip_kind: string
        }
        Insert: {
          boat_trip?: boolean
          boat_type?: string
          cancel_policy?: string
          city: string
          contribution_rub?: number
          cost_details?: string
          created_at?: string
          departure_at: string
          description?: string
          destination: string
          duration_hours?: number | null
          experience_needed?: string
          finance_mode?: string
          fishing_method?: string
          gear_included?: string
          gear_requirements?: string
          guide_experience_years?: number | null
          guide_service?: string
          id?: string
          life_jackets_available?: boolean
          live_sonar_model?: string
          live_sonar_system?: string
          meeting_area?: string
          operator_eligibility_confirmed?: boolean
          organizer_id: string
          platform_commission_bps?: number
          price_includes?: string
          safety_briefing?: boolean
          safety_notes?: string
          seats?: number
          social_style?: string
          sonar_model?: string
          status?: string
          target_fish?: string
          transport?: string
          trip_kind?: string
        }
        Update: {
          boat_trip?: boolean
          boat_type?: string
          cancel_policy?: string
          city?: string
          contribution_rub?: number
          cost_details?: string
          created_at?: string
          departure_at?: string
          description?: string
          destination?: string
          duration_hours?: number | null
          experience_needed?: string
          finance_mode?: string
          fishing_method?: string
          gear_included?: string
          gear_requirements?: string
          guide_experience_years?: number | null
          guide_service?: string
          id?: string
          life_jackets_available?: boolean
          live_sonar_model?: string
          live_sonar_system?: string
          meeting_area?: string
          operator_eligibility_confirmed?: boolean
          organizer_id?: string
          platform_commission_bps?: number
          price_includes?: string
          safety_briefing?: boolean
          safety_notes?: string
          seats?: number
          social_style?: string
          sonar_model?: string
          status?: string
          target_fish?: string
          transport?: string
          trip_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_trips_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_trips_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_user_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          review_status: string
          trip_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          review_status?: string
          trip_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          review_status?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "partner_user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_user_reports_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "partner_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      private_fishing_marks: {
        Row: {
          created_at: string
          id: string
          kind: string
          latitude: number
          longitude: number
          note: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          latitude: number
          longitude: number
          note?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          latitude?: number
          longitude?: number
          note?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_achievements: {
        Row: {
          achievement_code: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_code: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_code?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_symbol: string | null
          avatar_url: string | null
          bio: string | null
          chat_city: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_symbol?: string | null
          avatar_url?: string | null
          bio?: string | null
          chat_city?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_symbol?: string | null
          avatar_url?: string | null
          bio?: string | null
          chat_city?: string | null
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
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
          created_at: string
          id: string
          report_id: string
          sort_order: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          sort_order?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          sort_order?: number
          storage_path?: string
          user_id?: string
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
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
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
      review_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reporter_id: string
          review_id: string
          review_source: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reporter_id: string
          review_id: string
          review_source: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
          review_source?: string
          status?: string
        }
        Relationships: []
      }
      social_group_members: {
        Row: {
          created_at: string
          group_id: string
          invited_by: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          invited_by?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          invited_by?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_group_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_group_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_group_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_group_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_groups: {
        Row: {
          city: string
          country: string
          created_at: string
          description: string
          id: string
          interests: string
          name: string
          owner_id: string
          source_request_id: string | null
        }
        Insert: {
          city?: string
          country?: string
          created_at?: string
          description?: string
          id?: string
          interests?: string
          name: string
          owner_id: string
          source_request_id?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          description?: string
          id?: string
          interests?: string
          name?: string
          owner_id?: string
          source_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_groups_source_request_id_fkey"
            columns: ["source_request_id"]
            isOneToOne: true
            referencedRelation: "club_creation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      social_message_reactions: {
        Row: {
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "social_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      social_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          latitude: number | null
          location_title: string | null
          longitude: number | null
          reply_to_id: string | null
          sender_id: string
          source_mark_id: string | null
          thread_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          latitude?: number | null
          location_title?: string | null
          longitude?: number | null
          reply_to_id?: string | null
          sender_id: string
          source_mark_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          latitude?: number | null
          location_title?: string | null
          longitude?: number | null
          reply_to_id?: string | null
          sender_id?: string
          source_mark_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "social_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_messages_source_mark_id_fkey"
            columns: ["source_mark_id"]
            isOneToOne: false
            referencedRelation: "private_fishing_marks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "social_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      social_threads: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_threads_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_threads_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_threads_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_threads_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spearfishing_profiles: {
        Row: {
          access_type: string
          activity_style: string
          buddy_notes: string
          buddy_only: boolean
          equipment_overview: string
          experience_years: number | null
          home_city: string
          preferred_waters: string
          publicly_listed: boolean
          safety_training_self_reported: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          activity_style?: string
          buddy_notes?: string
          buddy_only?: boolean
          equipment_overview?: string
          experience_years?: number | null
          home_city?: string
          preferred_waters?: string
          publicly_listed?: boolean
          safety_training_self_reported?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          activity_style?: string
          buddy_notes?: string
          buddy_only?: boolean
          equipment_overview?: string
          experience_years?: number | null
          home_city?: string
          preferred_waters?: string
          publicly_listed?: boolean
          safety_training_self_reported?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spearfishing_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "spearfishing_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          rating: number
          reviewed_id: string
          reviewer_id: string
          trip_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          rating: number
          reviewed_id: string
          reviewer_id: string
          trip_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "partner_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_windows: {
        Row: {
          user_id: string
          window_at: string
        }
        Insert: {
          user_id: string
          window_at?: string
        }
        Update: {
          user_id?: string
          window_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_windows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_activity_windows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zapruda_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_activity_badges: {
        Row: {
          active_days: number | null
          active_windows: number | null
          beta_eligible: boolean | null
          credited_minutes: number | null
          earned_first_hour: boolean | null
          earned_ten_hours: boolean | null
          earned_week: boolean | null
          user_id: string | null
        }
        Relationships: []
      }
      my_atlas_progress: {
        Row: {
          atlas_completed: boolean | null
          caught_species: number | null
          known_species: number | null
          reviewed_species: number | null
          waterbody_id: string | null
          waterbody_name: string | null
        }
        Relationships: []
      }
      verified_guide_list: {
        Row: {
          boat_model: string | null
          experience_years: number | null
          home_city: string | null
          live_sonar_model: string | null
          live_sonar_system: string | null
          offers_life_jackets: boolean | null
          service_program: string | null
          specialties: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "my_activity_badges"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "guide_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_guide_quote: {
        Args: { p_id: string; p_method: string }
        Returns: undefined
      }
      activate_paid_club: { Args: { p_request_id: string }; Returns: string }
      admin_finance_summary: {
        Args: never
        Returns: {
          club_payment_confirmed_count: number
          club_payment_confirmed_rub: number
          completed_paid_bookings: number
          guide_amount_rub: number
          pending_booking_amount_rub: number
          pending_booking_count: number
          platform_commission_rub: number
          total_guide_payments_rub: number
        }[]
      }
      cancel_guide_booking: { Args: { p_id: string }; Returns: undefined }
      confirm_club_creation_payment: {
        Args: { p_reference: string; p_request_id: string }
        Returns: undefined
      }
      consume_spot_analytics_credit: { Args: never; Returns: boolean }
      ensure_chat_place: {
        Args: { p_city?: string; p_country_code: string; p_region?: string }
        Returns: string
      }
      fishing_session_command: {
        Args: { p_action: string }
        Returns: {
          active_seconds: number
          created_at: string
          finished_at: string | null
          id: string
          running_since: string | null
          started_at: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "fishing_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_fishing_progress: {
        Args: never
        Returns: {
          catches_count: number
          heaviest_catch_kg: number
          photo_count: number
          photo_reports: number
          reactions_received: number
          report_count: number
          trips_organized: number
        }[]
      }
      my_fishing_specializations: {
        Args: never
        Returns: {
          catches_count: number
          credited_catches: number
          distinct_waters: number
          fishing_method: string
          heaviest_catch_kg: number
          photo_reports: number
          report_count: number
        }[]
      }
      my_fishing_specializations_v2: {
        Args: never
        Returns: {
          active_days: number
          catches_count: number
          credited_catches: number
          credited_photo_reports: number
          credited_reports: number
          distinct_species: number
          distinct_waters: number
          fishing_method: string
          heaviest_catch_kg: number
          photo_reports: number
          report_count: number
        }[]
      }
      quote_guide_booking: {
        Args: { p_id: string; p_price: number; p_terms: string }
        Returns: undefined
      }
      review_guide_application: {
        Args: { p_approve: boolean; p_note?: string; p_user_id: string }
        Returns: undefined
      }
      set_my_primary_gear_set: {
        Args: { p_kit_id: string }
        Returns: undefined
      }
      submit_angler_review: {
        Args: {
          p_body: string
          p_context: string
          p_source: string
          p_stars: number
          p_target: string
        }
        Returns: string
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
