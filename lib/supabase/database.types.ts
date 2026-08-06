export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      community_route_translations: {
        Row: {
          description: string | null
          language: string
          route_id: string
          title: string
        }
        Insert: {
          description?: string | null
          language: string
          route_id: string
          title: string
        }
        Update: {
          description?: string | null
          language?: string
          route_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_route_translations_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "community_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      community_routes: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_routes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_translations: {
        Row: {
          bio: string | null
          guide_id: string
          language: string
          name: string
        }
        Insert: {
          bio?: string | null
          guide_id: string
          language: string
          name: string
        }
        Update: {
          bio?: string | null
          guide_id?: string
          language?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_translations_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_verified: boolean
          languages: string[]
          location: string
          rating: number
          review_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          languages?: string[]
          location: string
          rating?: number
          review_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          languages?: string[]
          location?: string
          rating?: number
          review_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      japanese_phrase_translations: {
        Row: {
          context: string | null
          language: string
          meaning: string
          phrase_id: string
        }
        Insert: {
          context?: string | null
          language: string
          meaning: string
          phrase_id: string
        }
        Update: {
          context?: string | null
          language?: string
          meaning?: string
          phrase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "japanese_phrase_translations_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "japanese_phrases"
            referencedColumns: ["id"]
          },
        ]
      }
      japanese_phrases: {
        Row: {
          created_at: string
          id: string
          japanese: string
          order: number
          reading: string | null
          spot_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          japanese: string
          order?: number
          reading?: string | null
          spot_id: string
        }
        Update: {
          created_at?: string
          id?: string
          japanese?: string
          order?: number
          reading?: string | null
          spot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "japanese_phrases_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      magazine_article_translations: {
        Row: {
          article_id: string
          content: string | null
          excerpt: string | null
          language: string
          title: string
        }
        Insert: {
          article_id: string
          content?: string | null
          excerpt?: string | null
          language: string
          title: string
        }
        Update: {
          article_id?: string
          content?: string | null
          excerpt?: string | null
          language?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "magazine_article_translations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "magazine_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      magazine_articles: {
        Row: {
          author_id: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          published_at: string | null
          read_time_minutes: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "magazine_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manner_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      manner_category_translations: {
        Row: {
          category_id: string
          description: string | null
          language: string
          name: string
        }
        Insert: {
          category_id: string
          description?: string | null
          language: string
          name: string
        }
        Update: {
          category_id?: string
          description?: string | null
          language?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "manner_category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "manner_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      manner_tip_translations: {
        Row: {
          description: string | null
          do_tips: string[]
          dont_tips: string[]
          language: string
          tip_id: string
          title: string
        }
        Insert: {
          description?: string | null
          do_tips?: string[]
          dont_tips?: string[]
          language: string
          tip_id: string
          title: string
        }
        Update: {
          description?: string | null
          do_tips?: string[]
          dont_tips?: string[]
          language?: string
          tip_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "manner_tip_translations_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "manner_tips"
            referencedColumns: ["id"]
          },
        ]
      }
      manner_tips: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_url: string | null
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "manner_tips_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "manner_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      package_translations: {
        Row: {
          description: string | null
          language: string
          package_id: string
          short_description: string | null
          title: string
        }
        Insert: {
          description?: string | null
          language: string
          package_id: string
          short_description?: string | null
          title: string
        }
        Update: {
          description?: string | null
          language?: string
          package_id?: string
          short_description?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_translations_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          area_id: string
          category_id: string | null
          created_at: string
          currency: string
          duration_minutes: number | null
          features: string[]
          guide_id: string
          id: string
          image_url: string | null
          price: number
          rating: number
          review_count: number
          spot_count: number
          status: string
          tags: string[]
          tutorial_video_url: string | null
          updated_at: string
        }
        Insert: {
          area_id: string
          category_id?: string | null
          created_at?: string
          currency?: string
          duration_minutes?: number | null
          features?: string[]
          guide_id: string
          id?: string
          image_url?: string | null
          price?: number
          rating?: number
          review_count?: number
          spot_count?: number
          status?: string
          tags?: string[]
          tutorial_video_url?: string | null
          updated_at?: string
        }
        Update: {
          area_id?: string
          category_id?: string | null
          created_at?: string
          currency?: string
          duration_minutes?: number | null
          features?: string[]
          guide_id?: string
          id?: string
          image_url?: string | null
          price?: number
          rating?: number
          review_count?: number
          spot_count?: number
          status?: string
          tags?: string[]
          tutorial_video_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          day: number
          duration_minutes: number | null
          id: string
          item_type: string
          manner_tip_id: string | null
          order: number
          plan_id: string
          scheduled_time: string | null
          spot_id: string | null
          title: string
        }
        Insert: {
          day: number
          duration_minutes?: number | null
          id?: string
          item_type: string
          manner_tip_id?: string | null
          order: number
          plan_id: string
          scheduled_time?: string | null
          spot_id?: string | null
          title: string
        }
        Update: {
          day?: number
          duration_minutes?: number | null
          id?: string
          item_type?: string
          manner_tip_id?: string | null
          order?: number
          plan_id?: string
          scheduled_time?: string | null
          spot_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_manner_tip_id_fkey"
            columns: ["manner_tip_id"]
            isOneToOne: false
            referencedRelation: "manner_tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          location: string | null
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          start_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          location?: string | null
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          native_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          native_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          native_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          currency: string
          id: string
          package_id: string
          purchased_at: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          currency?: string
          id?: string
          package_id: string
          purchased_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          currency?: string
          id?: string
          package_id?: string
          purchased_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          package_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          package_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          package_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_translations: {
        Row: {
          description: string | null
          etiquette_tips: string[]
          language: string
          local_tips: string[]
          name: string
          spot_id: string
        }
        Insert: {
          description?: string | null
          etiquette_tips?: string[]
          language: string
          local_tips?: string[]
          name: string
          spot_id: string
        }
        Update: {
          description?: string | null
          etiquette_tips?: string[]
          language?: string
          local_tips?: string[]
          name?: string
          spot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_translations_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          image_url: string | null
          map_url: string | null
          order: number
          package_id: string
          shop_url: string | null
          thumbnail_url: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          map_url?: string | null
          order: number
          package_id: string
          shop_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          map_url?: string | null
          order?: number
          package_id?: string
          shop_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spots_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

