export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_versions: {
        Row: {
          latest_version: string;
          message_bn: string | null;
          message_en: string | null;
          min_supported_version: string;
          platform: string;
          store_url: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          latest_version: string;
          message_bn?: string | null;
          message_en?: string | null;
          min_supported_version: string;
          platform: string;
          store_url?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          latest_version?: string;
          message_bn?: string | null;
          message_en?: string | null;
          min_supported_version?: string;
          platform?: string;
          store_url?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          id: number;
          institution_id: string | null;
          meta: NonNullable<Json>;
          occurred_at: string;
          record_id: string | null;
          table_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          id?: never;
          institution_id?: string | null;
          meta?: NonNullable<Json>;
          occurred_at?: string;
          record_id?: string | null;
          table_name?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          id?: never;
          institution_id?: string | null;
          meta?: NonNullable<Json>;
          occurred_at?: string;
          record_id?: string | null;
          table_name?: string | null;
        };
        Relationships: [];
      };
      feature_flags: {
        Row: {
          enabled: boolean;
          feature_key: string;
          id: string;
          institution_id: string | null;
          reason: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          enabled: boolean;
          feature_key: string;
          id?: string;
          institution_id?: string | null;
          reason?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          feature_key?: string;
          id?: string;
          institution_id?: string | null;
          reason?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'feature_flags_feature_key_fkey';
            columns: ['feature_key'];
            isOneToOne: false;
            referencedRelation: 'features';
            referencedColumns: ['key'];
          },
          {
            foreignKeyName: 'feature_flags_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      features: {
        Row: {
          created_at: string;
          default_enabled: boolean;
          depends_on: string[];
          description: string;
          key: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_enabled?: boolean;
          depends_on?: string[];
          description: string;
          key: string;
        };
        Update: {
          created_at?: string;
          default_enabled?: boolean;
          depends_on?: string[];
          description?: string;
          key?: string;
        };
        Relationships: [];
      };
      institution_settings: {
        Row: {
          institution_id: string;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          institution_id: string;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          institution_id?: string;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'institution_settings_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'institution_settings_key_fkey';
            columns: ['key'];
            isOneToOne: false;
            referencedRelation: 'setting_definitions';
            referencedColumns: ['key'];
          },
        ];
      };
      institutions: {
        Row: {
          config_version: number;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          eiin: string | null;
          id: string;
          is_active: boolean;
          meta: NonNullable<Json>;
          name: string;
          name_bn: string | null;
          slug: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          config_version?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          eiin?: string | null;
          id?: string;
          is_active?: boolean;
          meta?: NonNullable<Json>;
          name: string;
          name_bn?: string | null;
          slug: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          config_version?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          eiin?: string | null;
          id?: string;
          is_active?: boolean;
          meta?: NonNullable<Json>;
          name?: string;
          name_bn?: string | null;
          slug?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          created_at: string;
          description: string;
          is_sensitive: boolean;
          key: string;
          module: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description: string;
          is_sensitive?: boolean;
          key: string;
          module: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          is_sensitive?: boolean;
          key?: string;
          module?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          access_version: number;
          avatar_path: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string | null;
          email: string | null;
          full_name: string | null;
          full_name_bn: string | null;
          id: string;
          locale: string;
          meta: NonNullable<Json>;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          access_version?: number;
          avatar_path?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          full_name?: string | null;
          full_name_bn?: string | null;
          id: string;
          locale?: string;
          meta?: NonNullable<Json>;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          access_version?: number;
          avatar_path?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          full_name?: string | null;
          full_name_bn?: string | null;
          id?: string;
          locale?: string;
          meta?: NonNullable<Json>;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          created_at: string;
          permission_key: string;
          role_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          permission_key: string;
          role_id: string;
        };
        Update: {
          created_at?: string;
          permission_key?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_key_fkey';
            columns: ['permission_key'];
            isOneToOne: false;
            referencedRelation: 'permissions';
            referencedColumns: ['key'];
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          flags: NonNullable<Json>;
          id: string;
          institution_id: string | null;
          is_system: boolean;
          key: string;
          meta: NonNullable<Json>;
          name_bn: string;
          name_en: string;
          scope: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          flags?: NonNullable<Json>;
          id?: string;
          institution_id?: string | null;
          is_system?: boolean;
          key: string;
          meta?: NonNullable<Json>;
          name_bn: string;
          name_en: string;
          scope: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          flags?: NonNullable<Json>;
          id?: string;
          institution_id?: string | null;
          is_system?: boolean;
          key?: string;
          meta?: NonNullable<Json>;
          name_bn?: string;
          name_en?: string;
          scope?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'roles_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
        ];
      };
      setting_definitions: {
        Row: {
          created_at: string;
          default_value: NonNullable<Json>;
          description: string;
          json_schema: NonNullable<Json>;
          key: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_value: NonNullable<Json>;
          description: string;
          json_schema: NonNullable<Json>;
          key: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          default_value?: NonNullable<Json>;
          description?: string;
          json_schema?: NonNullable<Json>;
          key?: string;
          version?: number;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          group_id: string | null;
          id: string;
          institution_id: string;
          meta: NonNullable<Json>;
          revoked_at: string | null;
          revoked_by: string | null;
          role_id: string;
          updated_at: string;
          user_id: string;
          valid_from: string;
          valid_until: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          group_id?: string | null;
          id?: string;
          institution_id: string;
          meta?: NonNullable<Json>;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_id: string;
          updated_at?: string;
          user_id: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          group_id?: string | null;
          id?: string;
          institution_id?: string;
          meta?: NonNullable<Json>;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_id?: string;
          updated_at?: string;
          user_id?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_institution_id_fkey';
            columns: ['institution_id'];
            isOneToOne: false;
            referencedRelation: 'institutions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_role: {
        Args: {
          p_institution_id: string;
          p_role_key: string;
          p_user_id: string;
          p_valid_until?: string;
        };
        Returns: string;
      };
      enabled_features: { Args: { p_institution_id?: string }; Returns: string[] };
      get_settings: { Args: { p_institution_id: string }; Returns: Json };
      has_permission: {
        Args: { p_institution_id: string; p_permission: string };
        Returns: boolean;
      };
      my_access: {
        Args: Record<PropertyKey, never>;
        Returns: {
          institution_id: string;
          permissions: string[];
          role_keys: string[];
        }[];
      };
      public_app_version_policy: {
        Args: { p_platform: string };
        Returns: {
          latest_version: string;
          message_bn: string;
          message_en: string;
          min_supported_version: string;
          store_url: string;
        }[];
      };
      revoke_role: { Args: { p_user_role_id: string }; Returns: undefined };
      set_feature_flag: {
        Args: { p_enabled: boolean; p_institution_id?: string; p_key: string; p_reason?: string };
        Returns: undefined;
      };
      set_setting: {
        Args: { p_institution_id: string; p_key: string; p_value: Json };
        Returns: undefined;
      };
      track_events: { Args: { p_events: Json }; Returns: number };
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
