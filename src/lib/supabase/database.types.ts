/** Types locaux. A regenerer depuis Supabase quand le schema evoluera. */
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          author_id: string;
          category_id: string | null;
          title: string;
          description: string | null;
          age_min: number | null;
          age_max: number | null;
          participants_min: number | null;
          participants_max: number | null;
          duration_minutes: number | null;
          environment: Database["public"]["Enums"]["activity_environment"] | null;
          preparation: string | null;
          safety: string | null;
          visibility: Database["public"]["Enums"]["activity_visibility"];
          status: Database["public"]["Enums"]["activity_status"];
          published_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string;
          category_id?: string | null;
          title: string;
          description?: string | null;
          age_min?: number | null;
          age_max?: number | null;
          participants_min?: number | null;
          participants_max?: number | null;
          duration_minutes?: number | null;
          environment?: Database["public"]["Enums"]["activity_environment"] | null;
          preparation?: string | null;
          safety?: string | null;
          visibility?: Database["public"]["Enums"]["activity_visibility"];
          status?: Database["public"]["Enums"]["activity_status"];
          published_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [];
      };
      pedagogical_objectives: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
        Relationships: [];
      };
      equipment_items: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: { id?: string; name?: string };
        Relationships: [];
      };
      activity_objectives: {
        Row: { activity_id: string; objective_id: string };
        Insert: { activity_id: string; objective_id: string };
        Update: { activity_id?: string; objective_id?: string };
        Relationships: [];
      };
      activity_equipment: {
        Row: { activity_id: string; equipment_id: string };
        Insert: { activity_id: string; equipment_id: string };
        Update: { activity_id?: string; equipment_id?: string };
        Relationships: [];
      };
      activity_images: {
        Row: {
          id: string;
          activity_id: string;
          storage_path: string;
          is_cover: boolean;
          created_at: string;
        };
        Insert: { activity_id: string; storage_path: string; is_cover?: boolean };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      activity_saves: {
        Row: { user_id: string; activity_id: string; created_at: string };
        Insert: { activity_id: string };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          birth_date: string;
          account_type: Database["public"]["Enums"]["profile_account_type"];
          first_name: string | null;
          last_name: string | null;
          avatar_key: string | null;
          biography: string | null;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          birth_date: string;
          account_type?: Database["public"]["Enums"]["profile_account_type"];
          first_name?: string | null;
          last_name?: string | null;
          avatar_key?: string | null;
          biography?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          account_type?: Database["public"]["Enums"]["profile_account_type"];
          first_name?: string | null;
          last_name?: string | null;
          avatar_key?: string | null;
          biography?: string | null;
          location?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_activity_with_tags: {
        Args: {
          p_category_id: string;
          p_title: string;
          p_description: string;
          p_age_min: number;
          p_age_max: number;
          p_participants_min: number;
          p_participants_max: number;
          p_duration_minutes: number;
          p_environment: Database["public"]["Enums"]["activity_environment"];
          p_preparation: string;
          p_safety: string;
          p_visibility: Database["public"]["Enums"]["activity_visibility"];
          p_objectives: string[];
          p_equipment: string[];
        };
        Returns: string;
      };
      delete_activity_images: {
        Args: { p_activity_id: string; p_image_ids: string[] };
        Returns: string[];
      };
      get_activity_authors: {
        Args: { p_activity_ids: string[] };
        Returns: { id: string; username: string }[];
      };
      get_activity_gallery_counts: {
        Args: { p_activity_ids: string[] };
        Returns: { activity_id: string; save_count: number }[];
      };
      remove_activity_from_gallery: { Args: { p_activity_id: string }; Returns: string };
      update_activity_with_tags: {
        Args: {
          p_activity_id: string;
          p_category_id: string;
          p_title: string;
          p_description: string;
          p_age_min: number;
          p_age_max: number;
          p_participants_min: number;
          p_participants_max: number;
          p_duration_minutes: number;
          p_environment: Database["public"]["Enums"]["activity_environment"];
          p_preparation: string;
          p_safety: string;
          p_visibility: Database["public"]["Enums"]["activity_visibility"];
          p_objectives: string[];
          p_equipment: string[];
        };
        Returns: string;
      };
    };
    Enums: {
      profile_account_type: "animateur" | "directeur";
      activity_environment: "indoor" | "outdoor" | "both";
      activity_visibility: "private" | "public";
      activity_status: "draft" | "pending" | "published" | "rejected" | "hidden";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
