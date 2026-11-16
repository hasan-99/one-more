export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null;
          id: string;
          requested_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          cancelled_at?: string | null;
          id?: string;
          requested_at?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          cancelled_at?: string | null;
          id?: string;
          requested_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      areas: {
        Row: {
          city_id: string;
          created_at: string;
          id: string;
          name_el: string;
          name_en: string;
          slug: string;
        };
        Insert: {
          city_id: string;
          created_at?: string;
          id?: string;
          name_el: string;
          name_en: string;
          slug: string;
        };
        Update: {
          city_id?: string;
          created_at?: string;
          id?: string;
          name_el?: string;
          name_en?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'areas_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      challenge_requests: {
        Row: {
          away_team_id: string;
          challenge_id: string;
          created_at: string;
          id: string;
          requested_by: string;
          responded_at: string | null;
          status: string;
        };
        Insert: {
          away_team_id: string;
          challenge_id: string;
          created_at?: string;
          id?: string;
          requested_by: string;
          responded_at?: string | null;
          status?: string;
        };
        Update: {
          away_team_id?: string;
          challenge_id?: string;
          created_at?: string;
          id?: string;
          requested_by?: string;
          responded_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_requests_away_team_id_fkey';
            columns: ['away_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_requests_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'team_challenges';
            referencedColumns: ['id'];
          },
        ];
      };
      challenge_windows: {
        Row: {
          challenge_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          starts_at: string;
        };
        Insert: {
          challenge_id: string;
          created_at?: string;
          ends_at: string;
          id?: string;
          starts_at: string;
        };
        Update: {
          challenge_id?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'challenge_windows_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'team_challenges';
            referencedColumns: ['id'];
          },
        ];
      };
      cities: {
        Row: {
          country_code: string;
          created_at: string;
          id: string;
          name_el: string;
          name_en: string;
          slug: string;
        };
        Insert: {
          country_code: string;
          created_at?: string;
          id?: string;
          name_el: string;
          name_en: string;
          slug: string;
        };
        Update: {
          country_code?: string;
          created_at?: string;
          id?: string;
          name_el?: string;
          name_en?: string;
          slug?: string;
        };
        Relationships: [];
      };
      inbox_notifications: {
        Row: {
          body_key: string;
          created_at: string;
          details: Json;
          event_type: string;
          href: string;
          id: string;
          outbox_id: string | null;
          read_at: string | null;
          recipient_id: string;
          title_key: string;
        };
        Insert: {
          body_key: string;
          created_at?: string;
          details?: Json;
          event_type: string;
          href: string;
          id?: string;
          outbox_id?: string | null;
          read_at?: string | null;
          recipient_id: string;
          title_key: string;
        };
        Update: {
          body_key?: string;
          created_at?: string;
          details?: Json;
          event_type?: string;
          href?: string;
          id?: string;
          outbox_id?: string | null;
          read_at?: string | null;
          recipient_id?: string;
          title_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'inbox_notifications_outbox_id_fkey';
            columns: ['outbox_id'];
            isOneToOne: true;
            referencedRelation: 'notification_outbox';
            referencedColumns: ['id'];
          },
        ];
      };
      match_booking_private_details: {
        Row: {
          confirmed_at: string | null;
          match_id: string;
          organizer_notes: string | null;
          reference: string | null;
          reported_by: string;
          updated_at: string;
        };
        Insert: {
          confirmed_at?: string | null;
          match_id: string;
          organizer_notes?: string | null;
          reference?: string | null;
          reported_by: string;
          updated_at?: string;
        };
        Update: {
          confirmed_at?: string | null;
          match_id?: string;
          organizer_notes?: string | null;
          reference?: string | null;
          reported_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_booking_private_details_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: true;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_booking_private_details_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: true;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      match_message_reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          message_id: string;
          reason: string;
          reporter_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id: string;
          reason: string;
          reporter_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string;
          reason?: string;
          reporter_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_message_reports_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'match_messages';
            referencedColumns: ['id'];
          },
        ];
      };
      match_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          match_id: string;
          sender_id: string;
          status: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          match_id: string;
          sender_id: string;
          status?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          match_id?: string;
          sender_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_messages_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_messages_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      match_participants: {
        Row: {
          id: string;
          joined_at: string;
          match_id: string;
          requested_position_slot_id: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string;
          match_id: string;
          requested_position_slot_id?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string;
          match_id?: string;
          requested_position_slot_id?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_participants_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_participants_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_participants_requested_position_slot_id_fkey';
            columns: ['requested_position_slot_id'];
            isOneToOne: false;
            referencedRelation: 'match_position_slots';
            referencedColumns: ['id'];
          },
        ];
      };
      match_position_slots: {
        Row: {
          assigned_participant_id: string | null;
          created_at: string;
          id: string;
          match_id: string;
          position_code: string;
          status: string;
          x_pct: number;
          y_pct: number;
        };
        Insert: {
          assigned_participant_id?: string | null;
          created_at?: string;
          id?: string;
          match_id: string;
          position_code: string;
          status?: string;
          x_pct?: number;
          y_pct?: number;
        };
        Update: {
          assigned_participant_id?: string | null;
          created_at?: string;
          id?: string;
          match_id?: string;
          position_code?: string;
          status?: string;
          x_pct?: number;
          y_pct?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'match_position_slots_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_position_slots_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'position_slot_assignee_fk';
            columns: ['match_id', 'assigned_participant_id'];
            isOneToOne: false;
            referencedRelation: 'match_participants';
            referencedColumns: ['match_id', 'id'];
          },
        ];
      };
      match_reminders: {
        Row: {
          cancelled_at: string | null;
          created_at: string;
          id: string;
          match_id: string;
          offset_minutes: number;
          participant_id: string | null;
          queued_at: string | null;
          recipient_id: string;
          scheduled_for: string;
          status: string;
        };
        Insert: {
          cancelled_at?: string | null;
          created_at?: string;
          id?: string;
          match_id: string;
          offset_minutes: number;
          participant_id?: string | null;
          queued_at?: string | null;
          recipient_id: string;
          scheduled_for: string;
          status?: string;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string;
          id?: string;
          match_id?: string;
          offset_minutes?: number;
          participant_id?: string | null;
          queued_at?: string | null;
          recipient_id?: string;
          scheduled_for?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_reminders_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_reminders_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_reminders_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'match_participants';
            referencedColumns: ['id'];
          },
        ];
      };
      match_waitlist_entries: {
        Row: {
          id: string;
          match_id: string;
          position_code: string | null;
          queue_number: number;
          queued_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          position_code?: string | null;
          queue_number?: never;
          queued_at?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          position_code?: string | null;
          queue_number?: never;
          queued_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_waitlist_entries_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_waitlist_entries_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      match_waitlist_offers: {
        Row: {
          accepted_participant_id: string | null;
          created_at: string;
          entry_id: string;
          expires_at: string;
          id: string;
          match_id: string;
          status: string;
        };
        Insert: {
          accepted_participant_id?: string | null;
          created_at?: string;
          entry_id: string;
          expires_at: string;
          id?: string;
          match_id: string;
          status?: string;
        };
        Update: {
          accepted_participant_id?: string | null;
          created_at?: string;
          entry_id?: string;
          expires_at?: string;
          id?: string;
          match_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'match_waitlist_offers_accepted_participant_id_fkey';
            columns: ['accepted_participant_id'];
            isOneToOne: false;
            referencedRelation: 'match_participants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_waitlist_offers_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: false;
            referencedRelation: 'match_waitlist_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_waitlist_offers_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_waitlist_offers_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      matches: {
        Row: {
          area_id: string;
          booking_status: string;
          challenge_id: string | null;
          city_id: string;
          created_at: string;
          duration_minutes: number;
          event_status: string;
          id: string;
          notes: string | null;
          organizer_id: string;
          price_eur: number;
          reserved_guest_slots: number;
          side_size: number;
          skill_level: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
          venue_address: string;
          venue_display_name: string;
          venue_id: string | null;
          waitlist_offer_minutes: number;
        };
        Insert: {
          area_id: string;
          booking_status?: string;
          challenge_id?: string | null;
          city_id: string;
          created_at?: string;
          duration_minutes: number;
          event_status?: string;
          id?: string;
          notes?: string | null;
          organizer_id: string;
          price_eur?: number;
          reserved_guest_slots?: number;
          side_size: number;
          skill_level?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
          venue_address: string;
          venue_display_name: string;
          venue_id?: string | null;
          waitlist_offer_minutes?: number;
        };
        Update: {
          area_id?: string;
          booking_status?: string;
          challenge_id?: string | null;
          city_id?: string;
          created_at?: string;
          duration_minutes?: number;
          event_status?: string;
          id?: string;
          notes?: string | null;
          organizer_id?: string;
          price_eur?: number;
          reserved_guest_slots?: number;
          side_size?: number;
          skill_level?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
          venue_address?: string;
          venue_display_name?: string;
          venue_id?: string | null;
          waitlist_offer_minutes?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_area_city_fk';
            columns: ['area_id', 'city_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id', 'city_id'];
          },
          {
            foreignKeyName: 'matches_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'team_challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_outbox: {
        Row: {
          created_at: string;
          email_attempts: number;
          email_error_code: string | null;
          email_last_attempt_at: string | null;
          email_next_attempt_at: string;
          email_sent_at: string | null;
          email_status: string;
          event_type: string;
          id: string;
          match_id: string | null;
          participant_id: string | null;
          payload: Json;
          processed_at: string | null;
          recipient_id: string;
          waitlist_offer_id: string | null;
        };
        Insert: {
          created_at?: string;
          email_attempts?: number;
          email_error_code?: string | null;
          email_last_attempt_at?: string | null;
          email_next_attempt_at?: string;
          email_sent_at?: string | null;
          email_status?: string;
          event_type: string;
          id?: string;
          match_id?: string | null;
          participant_id?: string | null;
          payload?: Json;
          processed_at?: string | null;
          recipient_id: string;
          waitlist_offer_id?: string | null;
        };
        Update: {
          created_at?: string;
          email_attempts?: number;
          email_error_code?: string | null;
          email_last_attempt_at?: string | null;
          email_next_attempt_at?: string;
          email_sent_at?: string | null;
          email_status?: string;
          event_type?: string;
          id?: string;
          match_id?: string | null;
          participant_id?: string | null;
          payload?: Json;
          processed_at?: string | null;
          recipient_id?: string;
          waitlist_offer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_outbox_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'match_discovery';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_participant_id_fkey';
            columns: ['participant_id'];
            isOneToOne: false;
            referencedRelation: 'match_participants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_outbox_waitlist_offer_id_fkey';
            columns: ['waitlist_offer_id'];
            isOneToOne: false;
            referencedRelation: 'match_waitlist_offers';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          chat_email_enabled: boolean;
          created_at: string;
          discovery_email_enabled: boolean;
          in_app_enabled: boolean;
          native_push_enabled: boolean;
          transactional_email_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chat_email_enabled?: boolean;
          created_at?: string;
          discovery_email_enabled?: boolean;
          in_app_enabled?: boolean;
          native_push_enabled?: boolean;
          transactional_email_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chat_email_enabled?: boolean;
          created_at?: string;
          discovery_email_enabled?: boolean;
          in_app_enabled?: boolean;
          native_push_enabled?: boolean;
          transactional_email_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          area_id: string | null;
          avatar_path: string | null;
          city_id: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          language: string;
          onboarding_complete: boolean;
          phone: string | null;
          preferred_position: string | null;
          skill_level: string | null;
          strong_foot: string;
          shirt_number: number;
          updated_at: string;
        };
        Insert: {
          area_id?: string | null;
          avatar_path?: string | null;
          city_id?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          language?: string;
          onboarding_complete?: boolean;
          phone?: string | null;
          preferred_position?: string | null;
          skill_level?: string | null;
          strong_foot?: string;
          shirt_number?: number;
          updated_at?: string;
        };
        Update: {
          area_id?: string | null;
          avatar_path?: string | null;
          city_id?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          language?: string;
          onboarding_complete?: boolean;
          phone?: string | null;
          preferred_position?: string | null;
          skill_level?: string | null;
          strong_foot?: string;
          shirt_number?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_area_city_fkey';
            columns: ['area_id', 'city_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id', 'city_id'];
          },
          {
            foreignKeyName: 'profiles_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
      team_challenges: {
        Row: {
          agreed_starts_at: string | null;
          area_id: string;
          city_id: string;
          created_at: string;
          created_by: string;
          format: number;
          home_proposed_at: string | null;
          home_team_id: string;
          id: string;
          note: string | null;
          proposed_area_id: string | null;
          proposed_starts_at: string | null;
          proposed_venue_address: string | null;
          proposed_venue_name: string | null;
          skill_level: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          agreed_starts_at?: string | null;
          area_id: string;
          city_id: string;
          created_at?: string;
          created_by: string;
          format: number;
          home_proposed_at?: string | null;
          home_team_id: string;
          id?: string;
          note?: string | null;
          proposed_area_id?: string | null;
          proposed_starts_at?: string | null;
          proposed_venue_address?: string | null;
          proposed_venue_name?: string | null;
          skill_level?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          agreed_starts_at?: string | null;
          area_id?: string;
          city_id?: string;
          created_at?: string;
          created_by?: string;
          format?: number;
          home_proposed_at?: string | null;
          home_team_id?: string;
          id?: string;
          note?: string | null;
          proposed_area_id?: string | null;
          proposed_starts_at?: string | null;
          proposed_venue_address?: string | null;
          proposed_venue_name?: string | null;
          skill_level?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_challenges_area_city_fk';
            columns: ['area_id', 'city_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id', 'city_id'];
          },
          {
            foreignKeyName: 'team_challenges_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_challenges_home_team_id_fkey';
            columns: ['home_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_challenges_proposed_area_city_fk';
            columns: ['proposed_area_id', 'city_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id', 'city_id'];
          },
        ];
      };
      team_invites: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          invited_by: string;
          invited_user_id: string;
          responded_at: string | null;
          status: string;
          team_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          invited_user_id: string;
          responded_at?: string | null;
          status?: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          invited_user_id?: string;
          responded_at?: string | null;
          status?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_invites_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      team_members: {
        Row: {
          id: string;
          joined_at: string;
          role: string;
          status: string;
          team_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string;
          role?: string;
          status?: string;
          team_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string;
          role?: string;
          status?: string;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          captain_id: string;
          city_id: string;
          created_at: string;
          crest_color: string;
          crest_emblem: string;
          crest_pattern: string;
          crest_shape: string;
          description: string | null;
          id: string;
          home_area_id: string | null;
          name: string;
          open_to_players: boolean;
          preferred_format: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          captain_id: string;
          city_id: string;
          created_at?: string;
          crest_color?: string;
          crest_emblem?: string;
          crest_pattern?: string;
          crest_shape?: string;
          description?: string | null;
          id?: string;
          home_area_id?: string | null;
          name: string;
          open_to_players?: boolean;
          preferred_format?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          captain_id?: string;
          city_id?: string;
          created_at?: string;
          crest_color?: string;
          crest_emblem?: string;
          crest_pattern?: string;
          crest_shape?: string;
          description?: string | null;
          id?: string;
          home_area_id?: string | null;
          name?: string;
          open_to_players?: boolean;
          preferred_format?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teams_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teams_home_area_city_fkey';
            columns: ['home_area_id', 'city_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id', 'city_id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          availability_slots: string[];
          created_at: string;
          max_radius_km: number | null;
          preferred_formats: number[];
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          availability_slots?: string[];
          created_at?: string;
          max_radius_km?: number | null;
          preferred_formats?: number[];
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          availability_slots?: string[];
          created_at?: string;
          max_radius_km?: number | null;
          preferred_formats?: number[];
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      venues: {
        Row: {
          address: string;
          area_id: string;
          city_id: string;
          created_at: string;
          created_by: string;
          id: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
        };
        Insert: {
          address: string;
          area_id: string;
          city_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
        };
        Update: {
          address?: string;
          area_id?: string;
          city_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'venues_area_city_fk';
            columns: ['area_id', 'city_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id', 'city_id'];
          },
          {
            foreignKeyName: 'venues_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      match_discovery: {
        Row: {
          active_players: number | null;
          area_id: string | null;
          area_name_el: string | null;
          area_name_en: string | null;
          booking_status: string | null;
          capacity: number | null;
          city_id: string | null;
          city_name_el: string | null;
          city_name_en: string | null;
          created_at: string | null;
          duration_minutes: number | null;
          free_spots: number | null;
          id: string | null;
          is_organizer: boolean | null;
          notes: string | null;
          open_positions: Json | null;
          price_eur: number | null;
          reserved_guest_slots: number | null;
          side_size: number | null;
          skill_level: string | null;
          starts_at: string | null;
          title: string | null;
          venue_address: string | null;
          venue_display_name: string | null;
          venue_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_area_city_fk';
            columns: ['area_id', 'city_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id', 'city_id'];
          },
          {
            foreignKeyName: 'matches_city_id_fkey';
            columns: ['city_id'];
            isOneToOne: false;
            referencedRelation: 'cities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_venue_id_fkey';
            columns: ['venue_id'];
            isOneToOne: false;
            referencedRelation: 'venues';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      cancel_account_deletion_request: {
        Args: { p_request_id: string };
        Returns: boolean;
      };
      accept_waitlist_offer: { Args: { p_offer_id: string }; Returns: string };
      cancel_match: { Args: { p_match_id: string }; Returns: undefined };
      cancel_team_challenge: {
        Args: { p_challenge_id: string };
        Returns: string;
      };
      claim_notification_outbox: {
        Args: { p_outbox_id: string };
        Returns: {
          created_at: string;
          email_attempts: number;
          email_error_code: string | null;
          email_last_attempt_at: string | null;
          email_next_attempt_at: string;
          email_sent_at: string | null;
          email_status: string;
          event_type: string;
          id: string;
          match_id: string | null;
          participant_id: string | null;
          payload: Json;
          processed_at: string | null;
          recipient_id: string;
          waitlist_offer_id: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'notification_outbox';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      confirm_challenge_match: {
        Args: { p_challenge_id: string };
        Returns: string;
      };
      count_match_published_notifications: {
        Args: { p_match_id: string };
        Returns: number;
      };
      create_match_with_positions: {
        Args: { p_booking?: Json; p_match: Json; p_positions: Json };
        Returns: string;
      };
      create_team: {
        Args: { p_city_id: string; p_description?: string; p_name: string };
        Returns: string;
      };
      create_team_with_design: {
        Args: {
          p_area_id: string;
          p_city_id: string;
          p_crest_color: string;
          p_crest_emblem?: string;
          p_crest_pattern: string;
          p_crest_shape: string;
          p_format: number;
          p_name: string;
          p_open_to_players: boolean;
        };
        Returns: string;
      };
      create_team_challenge: {
        Args: {
          p_area_id: string;
          p_city_id: string;
          p_format: number;
          p_home_team_id: string;
          p_note: string;
          p_skill_level: string;
          p_windows: Json;
        };
        Returns: string;
      };
      decline_waitlist_offer: { Args: { p_offer_id: string }; Returns: string };
      finish_notification_email: {
        Args: { p_error_code?: string; p_outbox_id: string; p_status: string };
        Returns: boolean;
      };
      get_match_chat_access: { Args: { p_match_id: string }; Returns: boolean };
      get_match_chat_messages: {
        Args: {
          p_before_created_at?: string;
          p_before_id?: string;
          p_limit?: number;
          p_match_id: string;
        };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          match_id: string;
          sender_id: string;
          sender_name: string;
          status: string;
        }[];
      };
      get_match_chat_report_counts: {
        Args: { p_match_id: string };
        Returns: {
          message_id: string;
          reasons: string[];
          report_count: number;
        }[];
      };
      get_match_chat_role: { Args: { p_match_id: string }; Returns: string };
      get_match_join_requests: {
        Args: { p_match_id: string };
        Returns: {
          display_name: string;
          participant_id: string;
          position_label: string;
          requested_at: string;
          status: string;
        }[];
      };
      get_match_waitlist_state: { Args: { p_match_id: string }; Returns: Json };
      get_my_team_invites: {
        Args: never;
        Returns: {
          city_name_el: string;
          city_name_en: string;
          expires_at: string;
          invite_id: string;
          invited_by_name: string;
          team_id: string;
          team_name: string;
        }[];
      };
      get_my_teams: {
        Args: never;
        Returns: {
          crest_color?: string;
          crest_emblem?: string;
          crest_pattern?: string;
          crest_shape?: string;
          city_id: string;
          city_name_el: string;
          city_name_en: string;
          description: string;
          member_count: number;
          name: string;
          role: string;
          team_id: string;
        }[];
      };
      get_team_challenge_details: {
        Args: { p_challenge_id: string };
        Returns: Json;
      };
      get_team_details: { Args: { p_team_id: string }; Returns: Json };
      invite_team_member: {
        Args: { p_invited_user_id: string; p_team_id: string };
        Returns: string;
      };
      join_match_waitlist: {
        Args: { p_match_id: string; p_position_code?: string };
        Returns: string;
      };
      leave_match: { Args: { p_match_id: string }; Returns: string };
      leave_match_waitlist: { Args: { p_match_id: string }; Returns: string };
      leave_team: { Args: { p_team_id: string }; Returns: string };
      list_team_challenges: {
        Args: { p_city_id?: string; p_format?: number };
        Returns: {
          area_name_el: string;
          area_name_en: string;
          challenge_id: string;
          city_id: string;
          city_name_el: string;
          city_name_en: string;
          created_at: string;
          format: number;
          home_team_id: string;
          home_team_name: string;
          note: string;
          request_count: number;
          skill_level: string;
          status: string;
          windows: Json;
        }[];
      };
      list_team_directory: {
        Args: never;
        Returns: {
          crest_color?: string;
          crest_emblem?: string;
          crest_pattern?: string;
          crest_shape?: string;
          city_id: string;
          city_name_el: string;
          city_name_en: string;
          created_at: string;
          description: string;
          member_count: number;
          name: string;
          team_id: string;
        }[];
      };
      mark_all_inbox_notifications_read: { Args: never; Returns: number };
      mark_inbox_notification_read: {
        Args: { p_notification_id: string };
        Returns: boolean;
      };
      moderate_match_message: {
        Args: { p_message_id: string };
        Returns: undefined;
      };
      process_expired_waitlist_offers: { Args: never; Returns: number };
      propose_challenge_match: {
        Args: {
          p_area_id: string;
          p_challenge_id: string;
          p_starts_at: string;
          p_venue_address: string;
          p_venue_name: string;
        };
        Returns: undefined;
      };
      remove_team_member: {
        Args: { p_member_id: string; p_team_id: string };
        Returns: string;
      };
      report_match_message: {
        Args: { p_details?: string; p_message_id: string; p_reason: string };
        Returns: string;
      };
      request_match_join: {
        Args: { p_match_id: string; p_position_slot_id?: string };
        Returns: string;
      };
      request_team_challenge: {
        Args: { p_away_team_id: string; p_challenge_id: string };
        Returns: string;
      };
      request_account_deletion: { Args: never; Returns: string };
      delete_my_account: { Args: never; Returns: undefined };
      block_user: { Args: { p_user_id: string }; Returns: undefined };
      unblock_user: { Args: { p_user_id: string }; Returns: undefined };
      get_my_blocked_users: {
        Args: never;
        Returns: { user_id: string; display_name: string; blocked_at: string }[];
      };
      respond_team_invite: {
        Args: { p_decision: string; p_invite_id: string };
        Returns: string;
      };
      respond_to_challenge_request: {
        Args: { p_decision: string; p_request_id: string };
        Returns: string;
      };
      review_match_join_request: {
        Args: {
          p_decision: string;
          p_match_id: string;
          p_participant_id: string;
        };
        Returns: string;
      };
      revoke_team_invite: {
        Args: { p_invite_id: string; p_team_id: string };
        Returns: string;
      };
      search_team_invite_candidates: {
        Args: { p_query: string; p_team_id: string };
        Returns: {
          display_name: string;
          user_id: string;
        }[];
      };
      send_match_message: {
        Args: { p_body: string; p_match_id: string };
        Returns: string;
      };
      transfer_team_captain: {
        Args: { p_new_captain_user_id: string; p_team_id: string };
        Returns: undefined;
      };
      update_match_with_positions: {
        Args: {
          p_booking?: Json;
          p_match: Json;
          p_match_id: string;
          p_positions: Json;
        };
        Returns: string;
      };
      update_team: {
        Args: {
          p_city_id: string;
          p_description?: string;
          p_name: string;
          p_team_id: string;
        };
        Returns: undefined;
      };
      verify_notification_worker_token: {
        Args: { p_token: string };
        Returns: boolean;
      };
      withdraw_challenge_request: {
        Args: { p_request_id: string };
        Returns: string;
      };
      withdraw_match_join_request: {
        Args: { p_match_id: string; p_participant_id: string };
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
