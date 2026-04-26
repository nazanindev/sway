export type Database = {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          edit_token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["boards"]["Row"], "id" | "created_at" | "edit_token" | "expires_at"> & {
          id?: string;
          edit_token?: string;
          expires_at?: string;
        };
      };
      options: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          image_url: string | null;
          link_url: string | null;
          notes: string | null;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["options"]["Row"], "id" | "created_at"> & { id?: string };
      };
      reactions: {
        Row: {
          id: string;
          option_id: string;
          emoji: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reactions"]["Row"], "id" | "created_at"> & { id?: string };
      };
      comments: {
        Row: {
          id: string;
          option_id: string;
          user_name: string | null;
          body: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "id" | "created_at"> & { id?: string };
      };
      payments: {
        Row: {
          id: string;
          board_id: string;
          stripe_session_id: string;
          amount_cents: number;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at"> & { id?: string };
      };
    };
  };
};

export type Board = Database["public"]["Tables"]["boards"]["Row"];
export type Option = Database["public"]["Tables"]["options"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
