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
      profiles: {
        Row: {
          id: string;
          username: string;
          birth_date: string;
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
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
