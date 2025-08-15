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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      associacoes_usuarios_condominios: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          papel: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          papel: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          papel?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "associacoes_usuarios_condominios_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      condominios: {
        Row: {
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      inconsistencias: {
        Row: {
          descricao: string
          id: string
          nivel_criticidade: Database["public"]["Enums"]["criticism_level"]
          relatorio_id: string
          tipo: Database["public"]["Enums"]["inconsistency_type"]
        }
        Insert: {
          descricao: string
          id?: string
          nivel_criticidade: Database["public"]["Enums"]["criticism_level"]
          relatorio_id: string
          tipo: Database["public"]["Enums"]["inconsistency_type"]
        }
        Update: {
          descricao?: string
          id?: string
          nivel_criticidade?: Database["public"]["Enums"]["criticism_level"]
          relatorio_id?: string
          tipo?: Database["public"]["Enums"]["inconsistency_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inconsistencias_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      prestacoes_contas: {
        Row: {
          ano_referencia: number
          arquivo_url: string | null
          condominio_id: string
          created_at: string
          id: string
          mes_referencia: number
          status_analise: Database["public"]["Enums"]["analysis_status"]
          uploaded_by: string | null
        }
        Insert: {
          ano_referencia: number
          arquivo_url?: string | null
          condominio_id: string
          created_at?: string
          id?: string
          mes_referencia: number
          status_analise?: Database["public"]["Enums"]["analysis_status"]
          uploaded_by?: string | null
        }
        Update: {
          ano_referencia?: number
          arquivo_url?: string | null
          condominio_id?: string
          created_at?: string
          id?: string
          mes_referencia?: number
          status_analise?: Database["public"]["Enums"]["analysis_status"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestacoes_contas_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios_auditoria: {
        Row: {
          conteudo_gerado: Json | null
          data_geracao: string
          id: string
          prestacao_id: string
          resumo: string | null
        }
        Insert: {
          conteudo_gerado?: Json | null
          data_geracao?: string
          id?: string
          prestacao_id: string
          resumo?: string | null
        }
        Update: {
          conteudo_gerado?: Json | null
          data_geracao?: string
          id?: string
          prestacao_id?: string
          resumo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_auditoria_prestacao_id_fkey"
            columns: ["prestacao_id"]
            isOneToOne: true
            referencedRelation: "prestacoes_contas"
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
      analysis_status: "pendente" | "processando" | "concluido" | "erro"
      criticism_level: "baixa" | "media" | "alta"
      inconsistency_type: "financeira" | "conformidade" | "documental"
      user_role: "administrador" | "condomino_auditor"
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
  public: {
    Enums: {
      analysis_status: ["pendente", "processando", "concluido", "erro"],
      criticism_level: ["baixa", "media", "alta"],
      inconsistency_type: ["financeira", "conformidade", "documental"],
      user_role: ["administrador", "condomino_auditor"],
    },
  },
} as const
