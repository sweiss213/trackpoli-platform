
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "action": string,"actor_email": string | null,"actor_id": string | null,"actor_name": string | null,"actor_role": Database["public"]['Enums']["admin_role"] | null,"details": NonNullable<Json>,"id": number,"ip": unknown,"occurred_at": string,"request_id": string | null,"subject_id": string | null,"subject_type": string | null,"summary": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_email"?: string | null,"actor_id"?: string | null,"actor_name"?: string | null,"actor_role"?: Database["public"]['Enums']["admin_role"] | null,"details"?: NonNullable<Json>,"id"?: never,"ip"?: unknown,"occurred_at"?: string,"request_id"?: string | null,"subject_id"?: string | null,"subject_type"?: string | null,"summary": string
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string | null,"actor_id"?: string | null,"actor_name"?: string | null,"actor_role"?: Database["public"]['Enums']["admin_role"] | null,"details"?: NonNullable<Json>,"id"?: never,"ip"?: unknown,"occurred_at"?: string,"request_id"?: string | null,"subject_id"?: string | null,"subject_type"?: string | null,"summary"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_preferences": {
                  Row: {
                    "admin_id": string,"key": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_id": string,"key": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "admin_id"?: string,"key"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"operational_events": {
                  Row: {
                    "actor_id": string | null,"component": string,"context": NonNullable<Json>,"duration_ms": number | null,"environment": string | null,"error_code": string | null,"http_status": number | null,"id": number,"message": string,"occurred_at": string,"release": string | null,"request_id": string | null,"severity": Database["public"]['Enums']["ops_severity"],"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"component": string,"context"?: NonNullable<Json>,"duration_ms"?: number | null,"environment"?: string | null,"error_code"?: string | null,"http_status"?: number | null,"id"?: never,"message": string,"occurred_at"?: string,"release"?: string | null,"request_id"?: string | null,"severity": Database["public"]['Enums']["ops_severity"],"source": string
                  }
                  Update: {
                    "actor_id"?: string | null,"component"?: string,"context"?: NonNullable<Json>,"duration_ms"?: number | null,"environment"?: string | null,"error_code"?: string | null,"http_status"?: number | null,"id"?: never,"message"?: string,"occurred_at"?: string,"release"?: string | null,"request_id"?: string | null,"severity"?: Database["public"]['Enums']["ops_severity"],"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"policy_acceptances": {
                  Row: {
                    "accepted_at": string,"admin_email": string,"admin_id": string,"document": string,"id": number,"ip": unknown,"request_id": string | null,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string,"admin_email": string,"admin_id": string,"document": string,"id"?: never,"ip"?: unknown,"request_id"?: string | null,"version": string
                  }
                  Update: {
                    "accepted_at"?: string,"admin_email"?: string,"admin_id"?: string,"document"?: string,"id"?: never,"ip"?: unknown,"request_id"?: string | null,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"policy_versions": {
                  Row: {
                    "current_version": string,"document": string,"published_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "current_version": string,"document": string,"published_at"?: string
                  }
                  Update: {
                    "current_version"?: string,"document"?: string,"published_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "activated_at": string | null,"created_at": string,"deactivated_at": string | null,"deactivated_by": string | null,"display_name": string,"email": string,"id": string,"invited_at": string | null,"invited_by": string | null,"last_sign_in_at": string | null,"role": Database["public"]['Enums']["admin_role"],"status": Database["public"]['Enums']["admin_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"created_at"?: string,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"display_name": string,"email": string,"id": string,"invited_at"?: string | null,"invited_by"?: string | null,"last_sign_in_at"?: string | null,"role"?: Database["public"]['Enums']["admin_role"],"status"?: Database["public"]['Enums']["admin_status"],"updated_at"?: string
                  }
                  Update: {
                    "activated_at"?: string | null,"created_at"?: string,"deactivated_at"?: string | null,"deactivated_by"?: string | null,"display_name"?: string,"email"?: string,"id"?: string,"invited_at"?: string | null,"invited_by"?: string | null,"last_sign_in_at"?: string | null,"role"?: Database["public"]['Enums']["admin_role"],"status"?: Database["public"]['Enums']["admin_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sign_in_lockouts": {
                  Row: {
                    "email_hash": string,"failures": number,"locked_until": string | null,"strikes": number,"updated_at": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email_hash": string,"failures"?: number,"locked_until"?: string | null,"strikes"?: number,"updated_at"?: string,"window_start"?: string
                  }
                  Update: {
                    "email_hash"?: string,"failures"?: number,"locked_until"?: string | null,"strikes"?: number,"updated_at"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "clear_sign_in_failures":
{ Args: { "p_hash": string }; Returns: undefined
                           },
"current_admin_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["admin_role"]
                           },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"has_accepted_current_policies":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_aal2":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_manager":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_error":
{ Args: { "p_actor"?: string,"p_component": string,"p_context"?: Json,"p_duration_ms"?: number,"p_environment"?: string,"p_error_code": string,"p_http_status"?: number,"p_message": string,"p_release"?: string,"p_request"?: string,"p_severity": Database["public"]['Enums']["ops_severity"],"p_source": string }; Returns: number
                           },
"log_event":
{ Args: { "p_action": string,"p_actor": string,"p_details"?: Json,"p_ip"?: unknown,"p_request"?: string,"p_subject_id": string,"p_subject_type": string,"p_summary": string }; Returns: number
                           },
"purge_operational_events":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"rate_limit_check":
{ Args: { "p_key": string,"p_max": number,"p_window": string }; Returns: boolean
                           },
"record_sign_in_failure":
{ Args: { "p_hash": string }; Returns: string
                           },
"revoke_user_sessions":
{ Args: { "p_user": string }; Returns: undefined
                           },
"sign_in_attempts_remaining":
{ Args: { "p_hash": string }; Returns: number
                           },
"sign_in_lock_threshold":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"sign_in_paused_until":
{ Args: { "p_hash": string }; Returns: string
                           }
          }
          Enums: {
            "admin_role": "admin"|"admin_manager","admin_status": "invited"|"active"|"deactivated","ops_severity": "warning"|"error"|"critical"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "admin_role": ["admin", "admin_manager"],"admin_status": ["invited", "active", "deactivated"],"ops_severity": ["warning", "error", "critical"]
          }
        }
} as const
