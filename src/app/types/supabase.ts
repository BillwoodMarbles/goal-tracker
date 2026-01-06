export type Database = {
  public: {
    Tables: {
      group_goal_invites: {
        Row: {
          id: string;
          group_goal_id: string;
          token: string;
          created_by: string | null;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          group_goal_id: string;
          token: string;
          created_by: string | null;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          group_goal_id?: string;
          token?: string;
          created_by?: string | null;
          created_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      group_goals: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          created_at: string;
          is_active: boolean;
          start_date: string;
          end_date: string | null;
          days_of_week: string[];
          total_steps: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          created_at?: string;
          is_active?: boolean;
          start_date: string;
          end_date?: string | null;
          days_of_week?: string[];
          total_steps?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          created_at?: string;
          is_active?: boolean;
          start_date?: string;
          end_date?: string | null;
          days_of_week?: string[];
          total_steps?: number;
        };
        Relationships: [];
      };
      group_goal_members: {
        Row: {
          group_goal_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          group_goal_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          group_goal_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
          left_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
