// ============================================================
// SkyGrid Pro — Supabase Database Types
// Auto-generated template — run `supabase gen types typescript`
// to regenerate from your actual schema
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AircraftStatus  = 'ACTIVE' | 'STORED' | 'SCRAPPED' | 'WFU' | 'PRESERVED';
export type PhotoStatus     = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PhotoCategory   = 'TAKEOFF'|'LANDING'|'STATIC'|'COCKPIT'|'AIR_TO_AIR'|'NIGHT'|'SPECIAL_LIVERY'|'SCRAPPED_SHOT'|'OTHER';
export type AirlineStatus   = 'ACTIVE' | 'DEFUNCT' | 'MERGED' | 'SUSPENDED';
export type UserRole        = 'SPOTTER' | 'EXPERT' | 'MODERATOR' | 'ADMIN' | 'SCREENER';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id:                  string;
          username:            string;
          display_name:        string | null;
          avatar_url:          string | null;
          cover_url:           string | null;
          bio:                 string | null;
          location:            string | null;
          country_code:        string | null;
          home_airport_id:     string | null;
          role:                UserRole;
          rank:                string;
          rank_manual:         boolean | null;
          is_banned:           boolean | null;
          home_airport_iata:   string | null;
          total_uploads:       number;
          approved_uploads:    number;
          total_views:         number;
          total_likes:         number;
          airports_visited:    number;
          aircraft_types_shot: number;
          countries_visited:   number;
          follower_count:      number;
          following_count:     number;
          joined_at:           string;
          last_active:         string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'joined_at'|'last_active'|'role'|'rank'|'total_uploads'|'approved_uploads'|'total_views'|'total_likes'|'airports_visited'|'aircraft_types_shot'|'countries_visited'|'follower_count'|'following_count'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      aircraft: {
        Row: {
          id:           string;
          registration: string;
          type_id:      string | null;
          msn:          string | null;
          line_number:  string | null;
          icao_hex:     string | null;
          selcal:       string | null;
          year_built:   number | null;
          first_flight: string | null;
          status:       AircraftStatus;
          is_verified:  boolean;
          photo_count:  number;
          view_count:   number;
          like_count:   number;
          created_at:   string;
          updated_at:   string;
          created_by:   string | null;
          seat_config:  string | null;
          engines:      string | null;
          home_hub_iata: string | null;
        };
        Insert: Pick<Database['public']['Tables']['aircraft']['Row'], 'registration'> & Partial<Omit<Database['public']['Tables']['aircraft']['Row'], 'id'|'registration'|'created_at'|'updated_at'|'photo_count'|'view_count'|'like_count'>>;
        Update: Partial<Database['public']['Tables']['aircraft']['Insert']>;
      };
      photos: {
        Row: {
          id:               string;
          aircraft_id:      string;
          uploader_id:      string;
          operator_id:      string | null;
          airport_id:       string | null;
          shot_date:        string;
          shot_lat:         number | null;
          shot_lng:         number | null;
          category:         PhotoCategory;
          livery_notes:     string | null;
          notes:            string | null;
          storage_path:     string;
          webp_path:        string | null;
          thumb_path:       string | null;
          camera_make:      string | null;
          camera_model:     string | null;
          lens:             string | null;
          focal_length:     number | null;
          aperture:         number | null;
          shutter_speed:    string | null;
          iso:              number | null;
          width_px:         number | null;
          height_px:        number | null;
          file_size_kb:     number | null;
          status:           PhotoStatus;
          rejection_reason: string | null;
          moderated_by:     string | null;
          moderated_at:     string | null;
          like_count:       number;
          view_count:       number;
          rating_sum:       number;
          rating_count:     number;
          is_featured:      boolean;
          metadata_score:   number;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Pick<Database['public']['Tables']['photos']['Row'], 'aircraft_id'|'uploader_id'|'shot_date'|'storage_path'> & Partial<Omit<Database['public']['Tables']['photos']['Row'], 'id'|'aircraft_id'|'uploader_id'|'shot_date'|'storage_path'|'created_at'|'updated_at'|'like_count'|'view_count'|'rating_sum'|'rating_count'|'is_featured'|'metadata_score'>>;
        Update: Partial<Database['public']['Tables']['photos']['Insert']>;
      };
      photo_daily_views: {
        Row: { photo_id: string; view_date: string; views: number };
        Insert: { photo_id: string; view_date: string; views?: number };
        Update: Partial<{ photo_id: string; view_date: string; views: number }>;
      };
      photo_ratings: {
        Row: {
          photo_id: string;
          user_id: string;
          stars: number;
          created_at: string;
          updated_at: string;
        };
        Insert: { photo_id: string; user_id: string; stars: number };
        Update: Partial<{ stars: number; updated_at: string }>;
      };
      airlines: {
        Row: {
          id:           string;
          iata:         string | null;
          icao:         string | null;
          name:         string;
          country_code: string | null;
          logo_url:     string | null;
          hub_iata:     string | null;
          alliance:     string | null;
          fleet_size:   number;
          founded_year: number | null;
          status:       AirlineStatus;
          created_at:   string;
          updated_at:   string;
        };
        Insert: Pick<Database['public']['Tables']['airlines']['Row'], 'name'> & Partial<Omit<Database['public']['Tables']['airlines']['Row'], 'id'|'name'|'created_at'|'updated_at'|'fleet_size'>>;
        Update: Partial<Database['public']['Tables']['airlines']['Insert']>;
      };
      airports: {
        Row: {
          id:            string;
          iata:          string | null;
          icao:          string | null;
          name:          string;
          city:          string | null;
          country_code:  string | null;
          lat:           number | null;
          lng:           number | null;
          elevation_ft:  number | null;
          timezone:      string | null;
          photo_count:   number;
          spotter_count: number;
          created_at:    string;
        };
        Insert: Pick<Database['public']['Tables']['airports']['Row'], 'name'> & Partial<Omit<Database['public']['Tables']['airports']['Row'], 'id'|'name'|'created_at'|'photo_count'|'spotter_count'>>;
        Update: Partial<Database['public']['Tables']['airports']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_view_count: { Args: { photo_id: string }; Returns: undefined };
      top_spotters_today: {
        Args: { limit_n?: number };
        Returns: {
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          today_views: number;
        }[];
      };
    };
    Enums: {
      aircraft_status:  AircraftStatus;
      photo_status:     PhotoStatus;
      photo_category:   PhotoCategory;
      airline_status:   AirlineStatus;
      user_role:        UserRole;
    };
  };
}

// ── Convenience Row types ─────────────────────────────────
export type UserProfile   = Database['public']['Tables']['user_profiles']['Row'];
export type Aircraft      = Database['public']['Tables']['aircraft']['Row'];
export type Photo         = Database['public']['Tables']['photos']['Row'];
export type Airline       = Database['public']['Tables']['airlines']['Row'];
export type Airport       = Database['public']['Tables']['airports']['Row'];

// ── Joined query types ────────────────────────────────────
export interface PhotoWithRelations extends Photo {
  aircraft?:  Aircraft & { aircraft_types?: { name: string; icao_code: string } };
  uploader?:  Pick<UserProfile, 'id'|'username'|'display_name'|'avatar_url'|'rank'>;
  operator?:  Pick<Airline, 'id'|'iata'|'name'|'logo_url'>;
  airport?:   Pick<Airport, 'id'|'iata'|'icao'|'name'|'city'>;
}

export interface AircraftWithRelations extends Aircraft {
  aircraft_types?: { name: string; icao_code: string; manufacturer: string };
  current_operator?: Airline;
}
