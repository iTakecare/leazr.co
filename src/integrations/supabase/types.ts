export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_pending_requests: {
        Row: {
          amount: number | null
          client_company: string | null
          client_contact_email: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          coefficient: number | null
          commission: number | null
          converted_to_contract: boolean | null
          created_at: string | null
          equipment_description: string | null
          id: string | null
          monthly_payment: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          workflow_status: string | null
        }
        Insert: {
          amount?: number | null
          client_company?: string | null
          client_contact_email?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          coefficient?: number | null
          commission?: number | null
          converted_to_contract?: boolean | null
          created_at?: string | null
          equipment_description?: string | null
          id?: string | null
          monthly_payment?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workflow_status?: string | null
        }
        Update: {
          amount?: number | null
          client_company?: string | null
          client_contact_email?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          coefficient?: number | null
          commission?: number | null
          converted_to_contract?: boolean | null
          created_at?: string | null
          equipment_description?: string | null
          id?: string | null
          monthly_payment?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          workflow_status?: string | null
        }
        Relationships: []
      }
      ambassador_activity_logs: {
        Row: {
          action_type: string
          ambassador_id: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          ambassador_id: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          ambassador_id?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ambassador_clients: {
        Row: {
          ambassador_id: string
          client_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          ambassador_id: string
          client_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          ambassador_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_clients_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors: {
        Row: {
          address: string | null
          city: string | null
          clients_count: number | null
          commission_level_id: string | null
          commissions_total: number | null
          company: string | null
          company_id: string
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          has_user_account: boolean | null
          id: string
          last_commission: number | null
          last_name: string | null
          name: string
          notes: string | null
          pdf_template_id: string | null
          phone: string | null
          postal_code: string | null
          region: string | null
          status: string
          updated_at: string | null
          user_account_created_at: string | null
          user_id: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          clients_count?: number | null
          commission_level_id?: string | null
          commissions_total?: number | null
          company?: string | null
          company_id: string
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          has_user_account?: boolean | null
          id?: string
          last_commission?: number | null
          last_name?: string | null
          name: string
          notes?: string | null
          pdf_template_id?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          status?: string
          updated_at?: string | null
          user_account_created_at?: string | null
          user_id?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          clients_count?: number | null
          commission_level_id?: string | null
          commissions_total?: number | null
          company?: string | null
          company_id?: string
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          has_user_account?: boolean | null
          id?: string
          last_commission?: number | null
          last_name?: string | null
          name?: string
          notes?: string | null
          pdf_template_id?: string | null
          phone?: string | null
          postal_code?: string | null
          region?: string | null
          status?: string
          updated_at?: string | null
          user_account_created_at?: string | null
          user_id?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassadors_commission_level_id_fkey"
            columns: ["commission_level_id"]
            isOneToOne: false
            referencedRelation: "commission_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassadors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassadors_pdf_template_id_fkey"
            columns: ["pdf_template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          api_key: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          api_key?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          author_role: string | null
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          author_role?: string | null
          category: string
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          read_time?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          read_time?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          company_id: string
          created_at: string
          id: string
          image_search_patterns: Json | null
          name: string
          translation: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          image_search_patterns?: Json | null
          name: string
          translation: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          image_search_patterns?: Json | null
          name?: string
          translation?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          requirements: Json | null
          sector: string
          typical_budget_max: number | null
          typical_budget_min: number | null
          typical_team_size_max: number | null
          typical_team_size_min: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          requirements?: Json | null
          sector: string
          typical_budget_max?: number | null
          typical_budget_min?: number | null
          typical_team_size_max?: number | null
          typical_team_size_min?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          requirements?: Json | null
          sector?: string
          typical_budget_max?: number | null
          typical_budget_min?: number | null
          typical_team_size_max?: number | null
          typical_team_size_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          translation: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          translation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      category_environmental_data: {
        Row: {
          carbon_footprint_reduction_percentage: number | null
          category_id: string
          co2_savings_kg: number
          company_id: string
          created_at: string
          energy_savings_kwh: number | null
          id: string
          last_updated: string | null
          source_url: string | null
          updated_at: string
          waste_reduction_kg: number | null
          water_savings_liters: number | null
        }
        Insert: {
          carbon_footprint_reduction_percentage?: number | null
          category_id: string
          co2_savings_kg?: number
          company_id: string
          created_at?: string
          energy_savings_kwh?: number | null
          id?: string
          last_updated?: string | null
          source_url?: string | null
          updated_at?: string
          waste_reduction_kg?: number | null
          water_savings_liters?: number | null
        }
        Update: {
          carbon_footprint_reduction_percentage?: number | null
          category_id?: string
          co2_savings_kg?: number
          company_id?: string
          created_at?: string
          energy_savings_kwh?: number | null
          id?: string
          last_updated?: string | null
          source_url?: string | null
          updated_at?: string
          waste_reduction_kg?: number | null
          water_savings_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_environmental_data_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_environmental_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_agent_status: {
        Row: {
          agent_id: string
          company_id: string
          created_at: string
          current_conversations: number
          id: string
          is_available: boolean
          is_online: boolean
          last_seen_at: string
          max_conversations: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          company_id: string
          created_at?: string
          current_conversations?: number
          id?: string
          is_available?: boolean
          is_online?: boolean
          last_seen_at?: string
          max_conversations?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          company_id?: string
          created_at?: string
          current_conversations?: number
          id?: string
          is_available?: boolean
          is_online?: boolean
          last_seen_at?: string
          max_conversations?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_agent_status_agent"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_agent_status_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_availability_hours: {
        Row: {
          company_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          agent_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          status: string
          updated_at: string
          visitor_context: Json | null
          visitor_email: string | null
          visitor_id: string | null
          visitor_name: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          visitor_context?: Json | null
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_name?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
          visitor_context?: Json | null
          visitor_email?: string | null
          visitor_id?: string | null
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_conversations_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_conversations_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_conversations_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          metadata: Json | null
          sender_id: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_name: string
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_messages_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_custom_prices: {
        Row: {
          client_id: string
          company_id: string
          created_at: string | null
          custom_monthly_price: number | null
          custom_purchase_price: number | null
          id: string
          is_active: boolean | null
          margin_rate: number | null
          notes: string | null
          product_id: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string | null
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          is_active?: boolean | null
          margin_rate?: number | null
          notes?: string | null
          product_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string | null
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          is_active?: boolean | null
          margin_rate?: number | null
          notes?: string | null
          product_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_custom_prices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_custom_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_custom_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      client_custom_variant_combinations: {
        Row: {
          attributes: Json
          client_id: string
          created_at: string
          custom_monthly_price: number | null
          custom_purchase_price: number | null
          id: string
          is_available: boolean
          margin_rate: number | null
          notes: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          client_id: string
          created_at?: string
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          is_available?: boolean
          margin_rate?: number | null
          notes?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          client_id?: string
          created_at?: string
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          is_available?: boolean
          margin_rate?: number | null
          notes?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_custom_variant_prices: {
        Row: {
          client_id: string
          company_id: string
          created_at: string | null
          custom_monthly_price: number | null
          custom_purchase_price: number | null
          id: string
          is_active: boolean | null
          margin_rate: number | null
          notes: string | null
          updated_at: string | null
          variant_price_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string | null
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          is_active?: boolean | null
          margin_rate?: number | null
          notes?: string | null
          updated_at?: string | null
          variant_price_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string | null
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          is_active?: boolean | null
          margin_rate?: number | null
          notes?: string | null
          updated_at?: string | null
          variant_price_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_custom_variant_prices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_custom_variant_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_custom_variant_prices_variant_price_id_fkey"
            columns: ["variant_price_id"]
            isOneToOne: false
            referencedRelation: "product_variant_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_custom_variants: {
        Row: {
          attributes: Json
          client_id: string
          company_id: string
          created_at: string
          custom_monthly_price: number | null
          custom_purchase_price: number | null
          id: string
          margin_rate: number | null
          notes: string | null
          product_id: string
          updated_at: string
          variant_name: string
        }
        Insert: {
          attributes?: Json
          client_id: string
          company_id: string
          created_at?: string
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          margin_rate?: number | null
          notes?: string | null
          product_id: string
          updated_at?: string
          variant_name: string
        }
        Update: {
          attributes?: Json
          client_id?: string
          company_id?: string
          created_at?: string
          custom_monthly_price?: number | null
          custom_purchase_price?: number | null
          id?: string
          margin_rate?: number | null
          notes?: string | null
          product_id?: string
          updated_at?: string
          variant_name?: string
        }
        Relationships: []
      }
      client_delivery_sites: {
        Row: {
          address: string
          city: string
          client_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          notes: string | null
          postal_code: string | null
          site_name: string
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          client_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          notes?: string | null
          postal_code?: string | null
          site_name: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          client_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          notes?: string | null
          postal_code?: string | null
          site_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_delivery_sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          city: string | null
          company: string | null
          company_id: string
          contact_name: string | null
          country: string | null
          created_at: string
          default_leaser_id: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_country: string | null
          delivery_postal_code: string | null
          delivery_same_as_billing: boolean | null
          email: string | null
          first_name: string | null
          has_custom_catalog: boolean | null
          has_user_account: boolean | null
          hidden_variants: string[] | null
          id: string
          last_name: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          status: string | null
          updated_at: string
          user_account_created_at: string | null
          user_id: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          city?: string | null
          company?: string | null
          company_id: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          default_leaser_id?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_postal_code?: string | null
          delivery_same_as_billing?: boolean | null
          email?: string | null
          first_name?: string | null
          has_custom_catalog?: boolean | null
          has_user_account?: boolean | null
          hidden_variants?: string[] | null
          id?: string
          last_name?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string | null
          updated_at?: string
          user_account_created_at?: string | null
          user_id?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          city?: string | null
          company?: string | null
          company_id?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          default_leaser_id?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_postal_code?: string | null
          delivery_same_as_billing?: boolean | null
          email?: string | null
          first_name?: string | null
          has_custom_catalog?: boolean | null
          has_user_account?: boolean | null
          hidden_variants?: string[] | null
          id?: string
          last_name?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string | null
          updated_at?: string
          user_account_created_at?: string | null
          user_id?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_default_leaser_id_fkey"
            columns: ["default_leaser_id"]
            isOneToOne: false
            referencedRelation: "leasers"
            referencedColumns: ["id"]
          },
        ]
      }
      cloudflare_subdomain_logs: {
        Row: {
          cloudflare_record_id: string | null
          company_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          retry_count: number | null
          status: string
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          cloudflare_record_id?: string | null
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: string
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          cloudflare_record_id?: string | null
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: string
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloudflare_subdomain_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          client_id: string
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_levels: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_levels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          commission_level_id: string
          company_id: string
          created_at: string
          id: string
          max_amount: number
          min_amount: number
          rate: number
          updated_at: string
        }
        Insert: {
          commission_level_id: string
          company_id: string
          created_at?: string
          id?: string
          max_amount: number
          min_amount: number
          rate: number
          updated_at?: string
        }
        Update: {
          commission_level_id?: string
          company_id?: string
          created_at?: string
          id?: string
          max_amount?: number
          min_amount?: number
          rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rates_level_id_fkey"
            columns: ["commission_level_id"]
            isOneToOne: false
            referencedRelation: "commission_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accent_color: string | null
          account_status: string
          clients_count: number | null
          co2_saved: number | null
          created_at: string
          custom_domain: string | null
          devices_count: number | null
          favicon_url: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          modules_enabled: string[] | null
          name: string
          plan: string
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          started_year: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          account_status?: string
          clients_count?: number | null
          co2_saved?: number | null
          created_at?: string
          custom_domain?: string | null
          devices_count?: number | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          modules_enabled?: string[] | null
          name: string
          plan?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          started_year?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          account_status?: string
          clients_count?: number | null
          co2_saved?: number | null
          created_at?: string
          custom_domain?: string | null
          devices_count?: number | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          modules_enabled?: string[] | null
          name?: string
          plan?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          started_year?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_customizations: {
        Row: {
          accent_color: string | null
          company_address: string | null
          company_email: string | null
          company_id: string
          company_name: string | null
          company_phone: string | null
          created_at: string
          custom_domain: string | null
          favicon_url: string | null
          header_background_config: Json | null
          header_background_type: string | null
          header_description: string | null
          header_enabled: boolean | null
          header_title: string | null
          id: string
          iframe_height: string | null
          iframe_width: string | null
          logo_url: string | null
          primary_color: string | null
          quote_request_url: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_id: string
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          header_background_config?: Json | null
          header_background_type?: string | null
          header_description?: string | null
          header_enabled?: boolean | null
          header_title?: string | null
          id?: string
          iframe_height?: string | null
          iframe_width?: string | null
          logo_url?: string | null
          primary_color?: string | null
          quote_request_url?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_id?: string
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          header_background_config?: Json | null
          header_background_type?: string | null
          header_description?: string | null
          header_enabled?: boolean | null
          header_title?: string | null
          id?: string
          iframe_height?: string | null
          iframe_width?: string | null
          logo_url?: string | null
          primary_color?: string | null
          quote_request_url?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_customizations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_domains: {
        Row: {
          company_id: string
          created_at: string | null
          domain: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          subdomain: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          subdomain?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          subdomain?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_email_confirmations: {
        Row: {
          company_id: string
          confirmed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          company_id: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
        }
        Update: {
          company_id?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_email_confirmations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_integrations: {
        Row: {
          api_credentials: Json
          company_id: string
          created_at: string
          id: string
          integration_type: string
          is_enabled: boolean
          settings: Json
          updated_at: string
        }
        Insert: {
          api_credentials?: Json
          company_id: string
          created_at?: string
          id?: string
          integration_type: string
          is_enabled?: boolean
          settings?: Json
          updated_at?: string
        }
        Update: {
          api_credentials?: Json
          company_id?: string
          created_at?: string
          id?: string
          integration_type?: string
          is_enabled?: boolean
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_modules: {
        Row: {
          activated_at: string | null
          company_id: string | null
          enabled: boolean | null
          id: string
          module_id: string | null
          module_slug: string | null
        }
        Insert: {
          activated_at?: string | null
          company_id?: string | null
          enabled?: boolean | null
          id?: string
          module_id?: string | null
          module_slug?: string | null
        }
        Update: {
          activated_at?: string | null
          company_id?: string | null
          enabled?: boolean | null
          id?: string
          module_id?: string | null
          module_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      content_cms: {
        Row: {
          content: Json
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_documents: {
        Row: {
          admin_notes: string | null
          contract_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          contract_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          contract_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_equipment: {
        Row: {
          collaborator_id: string | null
          contract_id: string
          created_at: string
          id: string
          individual_serial_number: string | null
          is_individual: boolean | null
          margin: number
          monthly_payment: number | null
          parent_equipment_id: string | null
          purchase_price: number
          quantity: number
          serial_number: string | null
          title: string
          updated_at: string
        }
        Insert: {
          collaborator_id?: string | null
          contract_id: string
          created_at?: string
          id?: string
          individual_serial_number?: string | null
          is_individual?: boolean | null
          margin?: number
          monthly_payment?: number | null
          parent_equipment_id?: string | null
          purchase_price?: number
          quantity?: number
          serial_number?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          collaborator_id?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          individual_serial_number?: string | null
          is_individual?: boolean | null
          margin?: number
          monthly_payment?: number | null
          parent_equipment_id?: string | null
          purchase_price?: number
          quantity?: number
          serial_number?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_equipment_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_equipment_parent_equipment_id_fkey"
            columns: ["parent_equipment_id"]
            isOneToOne: false
            referencedRelation: "contract_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_equipment_attributes: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_equipment_attributes_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "contract_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_equipment_deliveries: {
        Row: {
          collaborator_id: string | null
          contract_equipment_id: string
          created_at: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_contact_email: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_date: string | null
          delivery_postal_code: string | null
          delivery_site_id: string | null
          delivery_type: string
          id: string
          notes: string | null
          quantity: number
          serial_numbers: string[] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          collaborator_id?: string | null
          contract_equipment_id: string
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_email?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_date?: string | null
          delivery_postal_code?: string | null
          delivery_site_id?: string | null
          delivery_type: string
          id?: string
          notes?: string | null
          quantity?: number
          serial_numbers?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          collaborator_id?: string | null
          contract_equipment_id?: string
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_email?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_date?: string | null
          delivery_postal_code?: string | null
          delivery_site_id?: string | null
          delivery_type?: string
          id?: string
          notes?: string | null
          quantity?: number
          serial_numbers?: string[] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_equipment_specifications: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_equipment_specifications_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "contract_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_workflow_logs: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          new_status: string
          previous_status: string
          reason: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          new_status: string
          previous_status: string
          reason?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          new_status?: string
          previous_status?: string
          reason?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_workflow_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          client_name: string
          company_id: string
          created_at: string
          delivery_carrier: string | null
          delivery_status: string | null
          equipment_description: string | null
          estimated_delivery: string | null
          id: string
          invoice_generated: boolean
          invoice_id: string | null
          leaser_logo: string | null
          leaser_name: string
          monthly_payment: number
          offer_id: string
          status: string
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          company_id: string
          created_at?: string
          delivery_carrier?: string | null
          delivery_status?: string | null
          equipment_description?: string | null
          estimated_delivery?: string | null
          id?: string
          invoice_generated?: boolean
          invoice_id?: string | null
          leaser_logo?: string | null
          leaser_name: string
          monthly_payment?: number
          offer_id: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          company_id?: string
          created_at?: string
          delivery_carrier?: string | null
          delivery_status?: string | null
          equipment_description?: string | null
          estimated_delivery?: string | null
          id?: string
          invoice_generated?: boolean
          invoice_id?: string | null
          leaser_logo?: string | null
          leaser_name?: string
          monthly_payment?: number
          offer_id?: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          dial_code: string
          flag: string
          is_priority: boolean
          name_en: string
          name_fr: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          dial_code: string
          flag: string
          is_priority?: boolean
          name_en: string
          name_fr: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          dial_code?: string
          flag?: string
          is_priority?: boolean
          name_en?: string
          name_fr?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_auth_tokens: {
        Row: {
          company_id: string
          created_at: string | null
          expires_at: string
          id: string
          metadata: Json | null
          token: string
          token_type: string
          used_at: string | null
          user_email: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          metadata?: Json | null
          token: string
          token_type: string
          used_at?: string | null
          user_email: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          metadata?: Json | null
          token?: string
          token_type?: string
          used_at?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_auth_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pdf_template_versions: {
        Row: {
          changes_description: string | null
          created_at: string
          created_by: string | null
          field_mappings: Json
          id: string
          is_major_version: boolean
          parent_version_id: string | null
          template_id: string
          template_metadata: Json
          version_number: number
        }
        Insert: {
          changes_description?: string | null
          created_at?: string
          created_by?: string | null
          field_mappings?: Json
          id?: string
          is_major_version?: boolean
          parent_version_id?: string | null
          template_id: string
          template_metadata?: Json
          version_number: number
        }
        Update: {
          changes_description?: string | null
          created_at?: string
          created_by?: string | null
          field_mappings?: Json
          id?: string
          is_major_version?: boolean
          parent_version_id?: string | null
          template_id?: string
          template_metadata?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_pdf_template_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "custom_pdf_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          html_content: string
          id: number
          name: string
          subject: string
          text_content: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          html_content: string
          id?: number
          name: string
          subject: string
          text_content?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          html_content?: string
          id?: number
          name?: string
          subject?: string
          text_content?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_alerts: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string
          dismissed_at: string | null
          equipment_id: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          read_at: string | null
          severity: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string
          dismissed_at?: string | null
          equipment_id?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          read_at?: string | null
          severity?: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string
          dismissed_at?: string | null
          equipment_id?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          severity?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_alerts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_alerts_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assignments_history: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          collaborator_id: string | null
          created_at: string
          equipment_id: string
          equipment_type: string
          id: string
          notes: string | null
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          collaborator_id?: string | null
          created_at?: string
          equipment_id: string
          equipment_type: string
          id?: string
          notes?: string | null
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          collaborator_id?: string | null
          created_at?: string
          equipment_id?: string
          equipment_type?: string
          id?: string
          notes?: string | null
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_history_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance: {
        Row: {
          company_id: string
          completed_date: string | null
          cost: number | null
          created_at: string
          created_by: string
          description: string
          equipment_id: string
          id: string
          maintenance_type: string
          notes: string | null
          performed_by: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by: string
          description: string
          equipment_id: string
          id?: string
          maintenance_type: string
          notes?: string | null
          performed_by?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string
          description?: string
          equipment_id?: string
          id?: string
          maintenance_type?: string
          notes?: string | null
          performed_by?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          description: string | null
          equipment_id: string | null
          estimated_cost: number | null
          id: string
          justification: string | null
          priority: string | null
          rejection_reason: string | null
          request_type: string
          requested_date: string | null
          requester_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          id?: string
          justification?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_type: string
          requested_date?: string | null
          requester_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          id?: string
          justification?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_type?: string
          requested_date?: string | null
          requester_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_tracking: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          equipment_id: string
          from_location: string | null
          from_user_id: string | null
          id: string
          movement_type: string
          notes: string | null
          to_location: string | null
          to_user_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          equipment_id: string
          from_location?: string | null
          from_user_id?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          to_location?: string | null
          to_user_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          equipment_id?: string
          from_location?: string | null
          from_user_id?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          to_location?: string | null
          to_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_tracking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_tracking_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_tracking_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_tracking_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_context: string | null
          error_message: string | null
          id: string
          request_data: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_context?: string | null
          error_message?: string | null
          id?: string
          request_data?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_context?: string | null
          error_message?: string | null
          id?: string
          request_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      fleet_configurations: {
        Row: {
          budget: number | null
          business_sector: string | null
          client_id: string | null
          company_id: string | null
          created_at: string | null
          equipment_list: Json
          generated_configuration: Json
          id: string
          monthly_cost: number | null
          name: string
          optimization_score: number | null
          requirements: Json | null
          status: string | null
          team_size: number
          template_id: string | null
          total_cost: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          budget?: number | null
          business_sector?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          equipment_list?: Json
          generated_configuration?: Json
          id?: string
          monthly_cost?: number | null
          name: string
          optimization_score?: number | null
          requirements?: Json | null
          status?: string | null
          team_size: number
          template_id?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          budget?: number | null
          business_sector?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          equipment_list?: Json
          generated_configuration?: Json
          id?: string
          monthly_cost?: number | null
          name?: string
          optimization_score?: number | null
          requirements?: Json | null
          status?: string | null
          team_size?: number
          template_id?: string | null
          total_cost?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_configurations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_configurations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fleet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_generation_logs: {
        Row: {
          action: string
          configuration_id: string | null
          created_at: string | null
          data: Json | null
          execution_time_ms: number | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          configuration_id?: string | null
          created_at?: string | null
          data?: Json | null
          execution_time_ms?: number | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          configuration_id?: string | null
          created_at?: string | null
          data?: Json | null
          execution_time_ms?: number | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_generation_logs_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "fleet_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_recommendations: {
        Row: {
          configuration_id: string | null
          cost_impact: number | null
          created_at: string | null
          data: Json | null
          description: string | null
          id: string
          impact_score: number | null
          is_applied: boolean | null
          recommendation_type: string
          title: string
        }
        Insert: {
          configuration_id?: string | null
          cost_impact?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          id?: string
          impact_score?: number | null
          is_applied?: boolean | null
          recommendation_type: string
          title: string
        }
        Update: {
          configuration_id?: string | null
          cost_impact?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          id?: string
          impact_score?: number | null
          is_applied?: boolean | null
          recommendation_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_recommendations_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "fleet_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_templates: {
        Row: {
          business_profile_id: string | null
          configuration: Json
          created_at: string | null
          description: string | null
          equipment_list: Json
          estimated_budget: number | null
          id: string
          is_active: boolean | null
          name: string
          team_size_max: number | null
          team_size_min: number | null
          updated_at: string | null
        }
        Insert: {
          business_profile_id?: string | null
          configuration?: Json
          created_at?: string | null
          description?: string | null
          equipment_list?: Json
          estimated_budget?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          team_size_max?: number | null
          team_size_min?: number | null
          updated_at?: string | null
        }
        Update: {
          business_profile_id?: string | null
          configuration?: Json
          created_at?: string | null
          description?: string | null
          equipment_list?: Json
          estimated_budget?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          team_size_max?: number | null
          team_size_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_templates_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_cms: {
        Row: {
          buttontext: string
          created_at: string
          id: string
          imageurl: string
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          buttontext: string
          created_at?: string
          id?: string
          imageurl: string
          subtitle: string
          title: string
          updated_at?: string
        }
        Update: {
          buttontext?: string
          created_at?: string
          id?: string
          imageurl?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      html_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "html_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          billing_data: Json
          company_id: string
          contract_id: string
          created_at: string
          due_date: string | null
          external_invoice_id: string | null
          generated_at: string | null
          id: string
          integration_type: string
          invoice_number: string | null
          leaser_name: string
          paid_at: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_data?: Json
          company_id: string
          contract_id: string
          created_at?: string
          due_date?: string | null
          external_invoice_id?: string | null
          generated_at?: string | null
          id?: string
          integration_type?: string
          invoice_number?: string | null
          leaser_name: string
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_data?: Json
          company_id?: string
          contract_id?: string
          created_at?: string
          due_date?: string | null
          external_invoice_id?: string | null
          generated_at?: string | null
          id?: string
          integration_type?: string
          invoice_number?: string | null
          leaser_name?: string
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaser_duration_coefficients: {
        Row: {
          coefficient: number
          created_at: string
          duration_months: number
          id: string
          leaser_range_id: string
          updated_at: string
        }
        Insert: {
          coefficient: number
          created_at?: string
          duration_months: number
          id?: string
          leaser_range_id: string
          updated_at?: string
        }
        Update: {
          coefficient?: number
          created_at?: string
          duration_months?: number
          id?: string
          leaser_range_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaser_duration_coefficients_leaser_range_id_fkey"
            columns: ["leaser_range_id"]
            isOneToOne: false
            referencedRelation: "leaser_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      leaser_ranges: {
        Row: {
          coefficient: number
          created_at: string | null
          duration_months: number
          id: string
          leaser_id: string | null
          max: number
          min: number
          updated_at: string | null
        }
        Insert: {
          coefficient?: number
          created_at?: string | null
          duration_months?: number
          id?: string
          leaser_id?: string | null
          max?: number
          min?: number
          updated_at?: string | null
        }
        Update: {
          coefficient?: number
          created_at?: string | null
          duration_months?: number
          id?: string
          leaser_id?: string | null
          max?: number
          min?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaser_ranges_leaser_id_fkey"
            columns: ["leaser_id"]
            isOneToOne: false
            referencedRelation: "leasers"
            referencedColumns: ["id"]
          },
        ]
      }
      leasers: {
        Row: {
          address: string | null
          available_durations: number[] | null
          city: string | null
          company_id: string
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          updated_at: string | null
          use_duration_coefficients: boolean
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          available_durations?: number[] | null
          city?: string | null
          company_id: string
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          use_duration_coefficients?: boolean
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          available_durations?: number[] | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          use_duration_coefficients?: boolean
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leasers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      menus_cms: {
        Row: {
          created_at: string
          id: string
          items: Json
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          location: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_cms: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_core: boolean | null
          name: string
          price_business: number | null
          price_pro: number | null
          price_starter: number | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_core?: boolean | null
          name: string
          price_business?: number | null
          price_pro?: number | null
          price_starter?: number | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_core?: boolean | null
          name?: string
          price_business?: number | null
          price_pro?: number | null
          price_starter?: number | null
          slug?: string
        }
        Relationships: []
      }
      netlify_configurations: {
        Row: {
          auto_deploy: boolean | null
          build_command: string | null
          company_id: string | null
          created_at: string | null
          custom_domain: string | null
          environment_variables: Json | null
          id: string
          publish_directory: string | null
          site_id: string | null
          site_name: string | null
          updated_at: string | null
        }
        Insert: {
          auto_deploy?: boolean | null
          build_command?: string | null
          company_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          environment_variables?: Json | null
          id?: string
          publish_directory?: string | null
          site_id?: string | null
          site_name?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_deploy?: boolean | null
          build_command?: string | null
          company_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          environment_variables?: Json | null
          id?: string
          publish_directory?: string | null
          site_id?: string | null
          site_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "netlify_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      netlify_deployments: {
        Row: {
          admin_url: string | null
          branch: string | null
          commit_ref: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deploy_id: string | null
          deploy_time: number | null
          deploy_url: string | null
          error_message: string | null
          id: string
          site_id: string | null
          site_name: string | null
          site_url: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_url?: string | null
          branch?: string | null
          commit_ref?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deploy_id?: string | null
          deploy_time?: number | null
          deploy_url?: string | null
          error_message?: string | null
          id?: string
          site_id?: string | null
          site_name?: string | null
          site_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_url?: string | null
          branch?: string | null
          commit_ref?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deploy_id?: string | null
          deploy_time?: number | null
          deploy_url?: string | null
          error_message?: string | null
          id?: string
          site_id?: string | null
          site_name?: string | null
          site_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "netlify_deployments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_documents: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          offer_id: string
          requested_by: string | null
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          offer_id: string
          requested_by?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          offer_id?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_documents_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_equipment: {
        Row: {
          collaborator_id: string | null
          created_at: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_contact_email: string | null
          delivery_contact_name: string | null
          delivery_contact_phone: string | null
          delivery_country: string | null
          delivery_notes: string | null
          delivery_postal_code: string | null
          delivery_site_id: string | null
          delivery_type: string | null
          id: string
          margin: number
          monthly_payment: number | null
          offer_id: string
          purchase_price: number
          quantity: number
          serial_number: string | null
          title: string
          updated_at: string
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_email?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          delivery_site_id?: string | null
          delivery_type?: string | null
          id?: string
          margin?: number
          monthly_payment?: number | null
          offer_id: string
          purchase_price?: number
          quantity?: number
          serial_number?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_contact_email?: string | null
          delivery_contact_name?: string | null
          delivery_contact_phone?: string | null
          delivery_country?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          delivery_site_id?: string | null
          delivery_type?: string | null
          id?: string
          margin?: number
          monthly_payment?: number | null
          offer_id?: string
          purchase_price?: number
          quantity?: number
          serial_number?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_equipment_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_equipment_delivery_site_id_fkey"
            columns: ["delivery_site_id"]
            isOneToOne: false
            referencedRelation: "client_delivery_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_equipment_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_equipment_attributes: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_equipment_attributes_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "offer_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_equipment_specifications: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_equipment_specifications_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "offer_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_info_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          offer_id: string
          requested_documents: string[]
          response_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          offer_id: string
          requested_documents: string[]
          response_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          offer_id?: string
          requested_documents?: string[]
          response_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_info_requests_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          offer_id: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_offer_notes_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_notes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_upload_links: {
        Row: {
          created_at: string
          created_by: string | null
          custom_message: string | null
          expires_at: string
          id: string
          offer_id: string
          requested_documents: string[]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_message?: string | null
          expires_at: string
          id?: string
          offer_id: string
          requested_documents: string[]
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_message?: string | null
          expires_at?: string
          id?: string
          offer_id?: string
          requested_documents?: string[]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_upload_links_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_workflow_logs: {
        Row: {
          created_at: string
          id: string
          new_status: string
          offer_id: string
          previous_status: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_status: string
          offer_id: string
          previous_status: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_status?: string
          offer_id?: string
          previous_status?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_offer_workflow_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          ambassador_id: string | null
          amount: number
          client_email: string | null
          client_id: string | null
          client_name: string
          coefficient: number
          commission: number | null
          commission_paid_at: string | null
          commission_status: string | null
          company_id: string
          converted_to_contract: boolean | null
          created_at: string | null
          equipment_description: string | null
          financed_amount: number | null
          id: string
          internal_score: string | null
          leaser_id: string | null
          leaser_score: string | null
          margin: number | null
          margin_difference: number | null
          monthly_payment: number
          previous_status: string | null
          remarks: string | null
          signature_data: string | null
          signed_at: string | null
          signer_ip: string | null
          signer_name: string | null
          status: string
          total_margin_with_difference: number | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          workflow_status: string | null
        }
        Insert: {
          ambassador_id?: string | null
          amount?: number
          client_email?: string | null
          client_id?: string | null
          client_name: string
          coefficient?: number
          commission?: number | null
          commission_paid_at?: string | null
          commission_status?: string | null
          company_id: string
          converted_to_contract?: boolean | null
          created_at?: string | null
          equipment_description?: string | null
          financed_amount?: number | null
          id?: string
          internal_score?: string | null
          leaser_id?: string | null
          leaser_score?: string | null
          margin?: number | null
          margin_difference?: number | null
          monthly_payment?: number
          previous_status?: string | null
          remarks?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: string
          total_margin_with_difference?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          workflow_status?: string | null
        }
        Update: {
          ambassador_id?: string | null
          amount?: number
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          coefficient?: number
          commission?: number | null
          commission_paid_at?: string | null
          commission_status?: string | null
          company_id?: string
          converted_to_contract?: boolean | null
          created_at?: string | null
          equipment_description?: string | null
          financed_amount?: number | null
          id?: string
          internal_score?: string | null
          leaser_id?: string | null
          leaser_score?: string | null
          margin?: number | null
          margin_difference?: number | null
          monthly_payment?: number
          previous_status?: string | null
          remarks?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: string
          total_margin_with_difference?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_leaser_id_fkey"
            columns: ["leaser_id"]
            isOneToOne: false
            referencedRelation: "leasers"
            referencedColumns: ["id"]
          },
        ]
      }
      pages_cms: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_clients: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          partner_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          partner_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_clients_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          amount: number
          client_id: string | null
          client_name: string
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          partner_id: string
          status: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          client_name: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          partner_id: string
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          partner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          city: string | null
          clients_count: number | null
          commission_level_id: string | null
          company_id: string
          contact_name: string
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          has_user_account: boolean | null
          id: string
          last_name: string | null
          last_transaction: number | null
          name: string
          notes: string | null
          pdf_template_id: string | null
          phone: string | null
          postal_code: string | null
          revenue_total: number | null
          status: string
          type: string
          updated_at: string | null
          user_account_created_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          clients_count?: number | null
          commission_level_id?: string | null
          company_id: string
          contact_name: string
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          has_user_account?: boolean | null
          id?: string
          last_name?: string | null
          last_transaction?: number | null
          name: string
          notes?: string | null
          pdf_template_id?: string | null
          phone?: string | null
          postal_code?: string | null
          revenue_total?: number | null
          status?: string
          type: string
          updated_at?: string | null
          user_account_created_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          clients_count?: number | null
          commission_level_id?: string | null
          company_id?: string
          contact_name?: string
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          has_user_account?: boolean | null
          id?: string
          last_name?: string | null
          last_transaction?: number | null
          name?: string
          notes?: string | null
          pdf_template_id?: string | null
          phone?: string | null
          postal_code?: string | null
          revenue_total?: number | null
          status?: string
          type?: string
          updated_at?: string | null
          user_account_created_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_commission_level_id_fkey"
            columns: ["commission_level_id"]
            isOneToOne: false
            referencedRelation: "commission_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_pdf_template_id_fkey"
            columns: ["pdf_template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_model_images: {
        Row: {
          created_at: string
          data: string
          id: string
          image_id: string
          model_id: string
          name: string
          page: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          image_id: string
          model_id: string
          name: string
          page?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          image_id?: string
          model_id?: string
          name?: string
          page?: number
          updated_at?: string
        }
        Relationships: []
      }
      pdf_models: {
        Row: {
          company_id: string
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at: string
          fields: Json | null
          footerText: string
          headerText: string
          id: string
          logoURL: string | null
          name: string
          primaryColor: string
          secondaryColor: string
          templateImages: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at?: string
          fields?: Json | null
          footerText: string
          headerText: string
          id: string
          logoURL?: string | null
          name: string
          primaryColor: string
          secondaryColor: string
          templateImages?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          companyAddress?: string
          companyContact?: string
          companyName?: string
          companySiret?: string
          created_at?: string
          fields?: Json | null
          footerText?: string
          headerText?: string
          id?: string
          logoURL?: string | null
          name?: string
          primaryColor?: string
          secondaryColor?: string
          templateImages?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_models_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_templates: {
        Row: {
          company_id: string | null
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at: string
          field_mappings: Json
          fields: Json
          footerText: string
          headerText: string
          id: string
          is_active: boolean
          is_default: boolean
          logoURL: string | null
          name: string
          primaryColor: string
          secondaryColor: string
          supported_offer_types: string[] | null
          template_category: string | null
          template_file_url: string | null
          template_type: string
          templateImages: Json | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at?: string
          field_mappings?: Json
          fields: Json
          footerText: string
          headerText: string
          id: string
          is_active?: boolean
          is_default?: boolean
          logoURL?: string | null
          name: string
          primaryColor: string
          secondaryColor: string
          supported_offer_types?: string[] | null
          template_category?: string | null
          template_file_url?: string | null
          template_type?: string
          templateImages?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          companyAddress?: string
          companyContact?: string
          companyName?: string
          companySiret?: string
          created_at?: string
          field_mappings?: Json
          fields?: Json
          footerText?: string
          headerText?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          logoURL?: string | null
          name?: string
          primaryColor?: string
          secondaryColor?: string
          supported_offer_types?: string[] | null
          template_category?: string | null
          template_file_url?: string | null
          template_type?: string
          templateImages?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          accent_color: string | null
          company_address: string | null
          company_description: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          created_at: string
          favicon_url: string | null
          id: string
          linkedin_url: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          company_address?: string | null
          company_description?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          company_address?: string | null
          company_description?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          linkedin_url?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      postal_codes: {
        Row: {
          city_name: string
          country_code: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          postal_code: string
          region: string | null
          updated_at: string | null
        }
        Insert: {
          city_name: string
          country_code: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          postal_code: string
          region?: string | null
          updated_at?: string | null
        }
        Update: {
          city_name?: string
          country_code?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          postal_code?: string
          region?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postal_codes_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          display_value: string
          id: string
          updated_at: string
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          display_value: string
          id?: string
          updated_at?: string
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          display_value?: string
          id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          created_at: string
          display_name: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_pack_items: {
        Row: {
          created_at: string
          custom_price_override: boolean
          id: string
          margin_percentage: number
          pack_id: string
          position: number
          product_id: string
          quantity: number
          unit_monthly_price: number
          unit_purchase_price: number
          variant_price_id: string | null
        }
        Insert: {
          created_at?: string
          custom_price_override?: boolean
          id?: string
          margin_percentage?: number
          pack_id: string
          position?: number
          product_id: string
          quantity?: number
          unit_monthly_price?: number
          unit_purchase_price?: number
          variant_price_id?: string | null
        }
        Update: {
          created_at?: string
          custom_price_override?: boolean
          id?: string
          margin_percentage?: number
          pack_id?: string
          position?: number
          product_id?: string
          quantity?: number
          unit_monthly_price?: number
          unit_purchase_price?: number
          variant_price_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_pack_items_pack_id"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "product_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_pack_items_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_pack_items_variant_price_id"
            columns: ["variant_price_id"]
            isOneToOne: false
            referencedRelation: "product_variant_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      product_packs: {
        Row: {
          admin_only: boolean
          company_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          leaser_id: string | null
          name: string
          pack_monthly_price: number | null
          pack_promo_price: number | null
          promo_active: boolean
          promo_valid_from: string | null
          promo_valid_to: string | null
          selected_duration: number | null
          total_margin: number
          total_monthly_price: number
          total_purchase_price: number
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          admin_only?: boolean
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          leaser_id?: string | null
          name: string
          pack_monthly_price?: number | null
          pack_promo_price?: number | null
          promo_active?: boolean
          promo_valid_from?: string | null
          promo_valid_to?: string | null
          selected_duration?: number | null
          total_margin?: number
          total_monthly_price?: number
          total_purchase_price?: number
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          admin_only?: boolean
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          leaser_id?: string | null
          name?: string
          pack_monthly_price?: number | null
          pack_promo_price?: number | null
          promo_active?: boolean
          promo_valid_from?: string | null
          promo_valid_to?: string | null
          selected_duration?: number | null
          total_margin?: number
          total_monthly_price?: number
          total_purchase_price?: number
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_packs_leaser_id_fkey"
            columns: ["leaser_id"]
            isOneToOne: false
            referencedRelation: "leasers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_prices: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          monthly_price: number | null
          price: number
          product_id: string
          stock: number | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          monthly_price?: number | null
          price?: number
          product_id: string
          stock?: number | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          monthly_price?: number | null
          price?: number
          product_id?: string
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          admin_only: boolean | null
          assigned_to: string | null
          attributes: Json | null
          brand_id: string | null
          brand_name: string | null
          category_id: string | null
          category_name: string | null
          company_id: string
          condition: string | null
          created_at: string | null
          default_variant_attributes: Json | null
          description: string | null
          id: string
          image_alt: string | null
          image_alts: string[] | null
          image_url: string | null
          image_urls: string[] | null
          imagealt: string | null
          imagealts: string[] | null
          imageurls: string[] | null
          is_parent: boolean | null
          is_refurbished: boolean | null
          is_variation: boolean | null
          last_maintenance_date: string | null
          location: string | null
          model: string | null
          monthly_price: number | null
          name: string
          next_maintenance_date: string | null
          parent_id: string | null
          price: number
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          short_description: string | null
          sku: string | null
          slug: string | null
          specifications: Json | null
          status: string | null
          stock: number | null
          updated_at: string | null
          variants_ids: string[] | null
          variation_attributes: Json | null
          warranty_end_date: string | null
          woocommerce_id: string | null
        }
        Insert: {
          active?: boolean | null
          admin_only?: boolean | null
          assigned_to?: string | null
          attributes?: Json | null
          brand_id?: string | null
          brand_name?: string | null
          category_id?: string | null
          category_name?: string | null
          company_id: string
          condition?: string | null
          created_at?: string | null
          default_variant_attributes?: Json | null
          description?: string | null
          id?: string
          image_alt?: string | null
          image_alts?: string[] | null
          image_url?: string | null
          image_urls?: string[] | null
          imagealt?: string | null
          imagealts?: string[] | null
          imageurls?: string[] | null
          is_parent?: boolean | null
          is_refurbished?: boolean | null
          is_variation?: boolean | null
          last_maintenance_date?: string | null
          location?: string | null
          model?: string | null
          monthly_price?: number | null
          name: string
          next_maintenance_date?: string | null
          parent_id?: string | null
          price?: number
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          specifications?: Json | null
          status?: string | null
          stock?: number | null
          updated_at?: string | null
          variants_ids?: string[] | null
          variation_attributes?: Json | null
          warranty_end_date?: string | null
          woocommerce_id?: string | null
        }
        Update: {
          active?: boolean | null
          admin_only?: boolean | null
          assigned_to?: string | null
          attributes?: Json | null
          brand_id?: string | null
          brand_name?: string | null
          category_id?: string | null
          category_name?: string | null
          company_id?: string
          condition?: string | null
          created_at?: string | null
          default_variant_attributes?: Json | null
          description?: string | null
          id?: string
          image_alt?: string | null
          image_alts?: string[] | null
          image_url?: string | null
          image_urls?: string[] | null
          imagealt?: string | null
          imagealts?: string[] | null
          imageurls?: string[] | null
          is_parent?: boolean | null
          is_refurbished?: boolean | null
          is_variation?: boolean | null
          last_maintenance_date?: string | null
          location?: string | null
          model?: string | null
          monthly_price?: number | null
          name?: string
          next_maintenance_date?: string | null
          parent_id?: string | null
          price?: number
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          specifications?: Json | null
          status?: string | null
          stock?: number | null
          updated_at?: string | null
          variants_ids?: string[] | null
          variation_attributes?: Json | null
          warranty_end_date?: string | null
          woocommerce_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_brand_id"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_products_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          company: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          activated_at: string | null
          activation_token: string | null
          address: string | null
          city: string | null
          company: string
          contact_name: string | null
          converted_at: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          has_different_shipping_address: boolean | null
          id: string
          is_ambassador_client: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          plan: string
          postal_code: string | null
          selected_modules: string[] | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          source: string | null
          status: string
          trial_ends_at: string
          trial_starts_at: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vat_number: string | null
        }
        Insert: {
          activated_at?: string | null
          activation_token?: string | null
          address?: string | null
          city?: string | null
          company: string
          contact_name?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          has_different_shipping_address?: boolean | null
          id?: string
          is_ambassador_client?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          plan?: string
          postal_code?: string | null
          selected_modules?: string[] | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          source?: string | null
          status?: string
          trial_ends_at?: string
          trial_starts_at?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vat_number?: string | null
        }
        Update: {
          activated_at?: string | null
          activation_token?: string | null
          address?: string | null
          city?: string | null
          company?: string
          contact_name?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          has_different_shipping_address?: boolean | null
          id?: string
          is_ambassador_client?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          plan?: string
          postal_code?: string | null
          selected_modules?: string[] | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          source?: string | null
          status?: string
          trial_ends_at?: string
          trial_starts_at?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          id: number
          logo_url: string | null
          site_description: string | null
          site_name: string
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: number
          logo_url?: string | null
          site_description?: string | null
          site_name?: string
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: number
          logo_url?: string | null
          site_description?: string | null
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          company_id: string | null
          created_at: string
          enabled: boolean
          from_email: string
          from_name: string
          host: string | null
          id: number
          password: string | null
          port: string | null
          resend_api_key: string | null
          secure: boolean | null
          updated_at: string
          use_resend: boolean | null
          username: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          enabled?: boolean
          from_email: string
          from_name?: string
          host?: string | null
          id: number
          password?: string | null
          port?: string | null
          resend_api_key?: string | null
          secure?: boolean | null
          updated_at?: string
          use_resend?: boolean | null
          username?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string | null
          id?: number
          password?: string | null
          port?: string | null
          resend_api_key?: string | null
          secure?: boolean | null
          updated_at?: string
          use_resend?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      steps_cms: {
        Row: {
          created_at: string
          description: string
          id: string
          imageurl: string
          number: number
          reverse: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          imageurl: string
          number: number
          reverse?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          imageurl?: string
          number?: number
          reverse?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          company_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ended_at: string | null
          id: string
          is_active: boolean | null
          plan: string
          started_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          plan: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean | null
          plan?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          expires_at: string | null
          granted: boolean
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      woocommerce_configs: {
        Row: {
          company_id: string
          consumer_key: string
          consumer_secret: string
          created_at: string | null
          id: string
          name: string | null
          site_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          consumer_key: string
          consumer_secret: string
          created_at?: string | null
          id?: string
          name?: string | null
          site_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          consumer_key?: string
          consumer_secret?: string
          created_at?: string | null
          id?: string
          name?: string | null
          site_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_prospect: {
        Args: { p_activation_token: string; p_password: string }
        Returns: {
          success: boolean
          user_id: string
          company_id: string
          message: string
        }[]
      }
      add_brand: {
        Args: { brand_name: string; brand_translation: string }
        Returns: {
          company_id: string
          created_at: string
          id: string
          image_search_patterns: Json | null
          name: string
          translation: string
          updated_at: string
          website_url: string | null
        }
      }
      apply_permission_profile: {
        Args: { p_user_id: string; p_profile_id: string }
        Returns: boolean
      }
      calculate_total_revenue: {
        Args: { time_filter: string }
        Returns: {
          total_revenue: number
          gross_margin: number
          clients_count: number
        }[]
      }
      can_manage_users: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_bucket_exists: {
        Args: { bucket_name: string }
        Returns: boolean
      }
      check_function_exists: {
        Args: { function_name: string }
        Returns: boolean
      }
      check_table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
      check_user_exists_by_email: {
        Args: { user_email: string }
        Returns: boolean
      }
      check_user_exists_by_id: {
        Args: { user_id: string }
        Returns: boolean
      }
      cleanup_company_data_isolation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_expired_auth_tokens: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_prospects: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      complete_data_isolation_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      complete_isolation_diagnostic: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          user_company_data_count: number
          itakecare_data_count: number
          other_company_data_count: number
          isolation_status: string
        }[]
      }
      count_ambassador_clients_secure: {
        Args: { p_user_id: string }
        Returns: number
      }
      create_api_key_secure: {
        Args: { p_name: string; p_permissions?: Json }
        Returns: {
          id: string
          name: string
          api_key: string
          permissions: Json
          is_active: boolean
          last_used_at: string
          created_at: string
          updated_at: string
          company_id: string
          created_by: string
        }[]
      }
      create_categories_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_client_as_ambassador: {
        Args: { client_data: Json; ambassador_id: string }
        Returns: string
      }
      create_company_user: {
        Args: {
          p_email: string
          p_password: string
          p_first_name: string
          p_last_name: string
          p_role: string
          p_company_id: string
        }
        Returns: string
      }
      create_company_with_admin: {
        Args: {
          company_name: string
          admin_email: string
          admin_password: string
          admin_first_name: string
          admin_last_name: string
          plan_type?: string
        }
        Returns: string
      }
      create_company_with_admin_complete: {
        Args: {
          p_company_name: string
          p_admin_email: string
          p_admin_first_name: string
          p_admin_last_name: string
          p_plan?: string
        }
        Returns: {
          company_id: string
          user_id: string
          success: boolean
        }[]
      }
      create_contract_workflow_log: {
        Args: {
          p_contract_id: string
          p_previous_status: string
          p_new_status: string
          p_reason?: string
        }
        Returns: string
      }
      create_default_leasers_for_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      create_default_smtp_settings_for_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      create_maintenance_alerts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_primary_collaborator_for_client: {
        Args: {
          p_client_id: string
          p_client_name: string
          p_client_email?: string
          p_contact_name?: string
        }
        Returns: string
      }
      create_prospect: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_company_name: string
          p_plan?: string
          p_selected_modules?: string[]
        }
        Returns: {
          prospect_id: string
          activation_token: string
          trial_ends_at: string
        }[]
      }
      create_storage_bucket: {
        Args: { bucket_name: string }
        Returns: undefined
      }
      create_storage_policy: {
        Args: {
          bucket_name: string
          policy_name: string
          definition: string
          policy_type: string
        }
        Returns: undefined
      }
      delete_brand: {
        Args: { brand_name: string }
        Returns: boolean
      }
      detect_company_from_domain: {
        Args: { request_origin: string }
        Returns: string
      }
      diagnose_ambassador_isolation: {
        Args: Record<PropertyKey, never>
        Returns: {
          step_name: string
          result: string
          details: string
        }[]
      }
      diagnose_api_key_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          company_id: string
          user_role: string
          is_admin: boolean
          has_company_access: boolean
          checked_at: string
        }[]
      }
      diagnose_data_isolation: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          user_company_data_count: number
          other_company_data_count: number
          isolation_status: string
        }[]
      }
      ensure_client_logos_bucket: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ensure_site_settings_bucket: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      execute_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      find_duplicate_client_emails: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      generate_company_slug: {
        Args: { company_name: string }
        Returns: string
      }
      generate_company_subdomain: {
        Args: { company_name: string }
        Returns: string
      }
      get_all_clients_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          email: string
          company: string
          phone: string
          address: string
          city: string
          postal_code: string
          country: string
          vat_number: string
          notes: string
          status: string
          created_at: string
          updated_at: string
          user_id: string
          has_user_account: boolean
          company_id: string
          is_ambassador_client: boolean
        }[]
      }
      get_all_users_extended: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          email_confirmed_at: string
          last_sign_in_at: string
          created_at: string
        }[]
      }
      get_ambassador_clients_secure: {
        Args: { p_user_id: string }
        Returns: {
          client_id: string
          client_name: string
          client_email: string
          client_company: string
          client_phone: string
          client_address: string
          client_city: string
          client_postal_code: string
          client_country: string
          client_vat_number: string
          client_notes: string
          client_status: string
          client_created_at: string
          client_updated_at: string
          client_user_id: string
          client_has_user_account: boolean
          client_company_id: string
          link_created_at: string
        }[]
      }
      get_blog_categories: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          count: number
        }[]
      }
      get_blog_post_by_slug: {
        Args: { post_slug: string }
        Returns: {
          author_avatar: string | null
          author_name: string | null
          author_role: string | null
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_blog_posts: {
        Args: { category_filter?: string }
        Returns: {
          author_avatar: string | null
          author_name: string | null
          author_role: string | null
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_brands: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_id: string
          created_at: string
          id: string
          image_search_patterns: Json | null
          name: string
          translation: string
          updated_at: string
          website_url: string | null
        }[]
      }
      get_cities_by_postal_code: {
        Args: { p_postal_code: string; p_country_code?: string }
        Returns: {
          postal_code: string
          city: string
          region: string
          country_code: string
          country_name: string
        }[]
      }
      get_company_ambassadors_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          email: string
          phone: string
          region: string
          status: string
          notes: string
          address: string
          city: string
          postal_code: string
          country: string
          company: string
          vat_number: string
          has_user_account: boolean
          user_id: string
          user_account_created_at: string
          updated_at: string
          created_at: string
          last_commission: number
          commissions_total: number
          clients_count: number
          commission_level_id: string
          company_id: string
          pdf_template_id: string
        }[]
      }
      get_company_by_slug: {
        Args: { company_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
          logo_url: string
          primary_color: string
          secondary_color: string
          accent_color: string
        }[]
      }
      get_company_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_clients: number
          total_offers: number
          total_contracts: number
          total_revenue: number
          pending_offers: number
          active_contracts: number
          recent_signups: number
        }[]
      }
      get_company_partners_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          contact_name: string
          email: string
          phone: string
          type: string
          status: string
          notes: string
          created_at: string
          updated_at: string
          clients_count: number
          revenue_total: number
          last_transaction: number
          commission_level_id: string
          has_user_account: boolean
          user_account_created_at: string
          user_id: string
          company_id: string
        }[]
      }
      get_company_recent_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          activity_type: string
          activity_description: string
          created_at: string
          entity_id: string
        }[]
      }
      get_company_slug_by_upload_token: {
        Args: { upload_token: string }
        Returns: string
      }
      get_company_users: {
        Args:
          | Record<PropertyKey, never>
          | { p_company_id: string; role_filter?: string }
        Returns: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: string
          company_id: string
          created_at: string
        }[]
      }
      get_contract_workflow_logs: {
        Args: { p_contract_id: string }
        Returns: {
          id: string
          contract_id: string
          user_id: string
          previous_status: string
          new_status: string
          reason: string
          created_at: string
          user_name: string
          profiles: Json
        }[]
      }
      get_current_user_company_id_secure: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          company_id: string
          role: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_default_country_for_company: {
        Args: Record<PropertyKey, never> | { p_company_id: string }
        Returns: string
      }
      get_featured_blog_posts: {
        Args: Record<PropertyKey, never>
        Returns: {
          author_avatar: string | null
          author_name: string | null
          author_role: string | null
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_free_clients_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          email: string
          company: string
          phone: string
          address: string
          city: string
          postal_code: string
          country: string
          vat_number: string
          notes: string
          status: string
          created_at: string
          updated_at: string
          user_id: string
          has_user_account: boolean
          company_id: string
        }[]
      }
      get_menus_cms: {
        Args: { location_name: string }
        Returns: {
          created_at: string
          id: string
          items: Json
          location: string
          name: string
          updated_at: string
        }[]
      }
      get_offer_by_id_public: {
        Args: { offer_id: string }
        Returns: {
          ambassador_id: string | null
          amount: number
          client_email: string | null
          client_id: string | null
          client_name: string
          coefficient: number
          commission: number | null
          commission_paid_at: string | null
          commission_status: string | null
          company_id: string
          converted_to_contract: boolean | null
          created_at: string | null
          equipment_description: string | null
          financed_amount: number | null
          id: string
          internal_score: string | null
          leaser_id: string | null
          leaser_score: string | null
          margin: number | null
          margin_difference: number | null
          monthly_payment: number
          previous_status: string | null
          remarks: string | null
          signature_data: string | null
          signed_at: string | null
          signer_ip: string | null
          signer_name: string | null
          status: string
          total_margin_with_difference: number | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          workflow_status: string | null
        }[]
      }
      get_pages_cms: {
        Args: Record<PropertyKey, never>
        Returns: {
          content: string
          created_at: string
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_pdf_templates: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_id: string | null
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at: string
          field_mappings: Json
          fields: Json
          footerText: string
          headerText: string
          id: string
          is_active: boolean
          is_default: boolean
          logoURL: string | null
          name: string
          primaryColor: string
          secondaryColor: string
          supported_offer_types: string[] | null
          template_category: string | null
          template_file_url: string | null
          template_type: string
          templateImages: Json | null
          updated_at: string
        }[]
      }
      get_postal_code_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          country_code: string
          country_name: string
          postal_code_count: number
          last_updated: string
        }[]
      }
      get_prospects_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_prospects: number
          active_prospects: number
          converted_prospects: number
          expired_prospects: number
          conversion_rate: number
        }[]
      }
      get_public_company_customizations: {
        Args: { p_company_id: string }
        Returns: {
          header_enabled: boolean
          header_title: string
          header_description: string
          header_background_type: string
          header_background_config: Json
          company_name: string
          logo_url: string
          primary_color: string
          secondary_color: string
          accent_color: string
          quote_request_url: string
        }[]
      }
      get_public_company_info: {
        Args: { company_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
          logo_url: string
          primary_color: string
          secondary_color: string
          accent_color: string
        }[]
      }
      get_public_products_by_company: {
        Args: { p_company_id: string }
        Returns: {
          id: string
          name: string
          description: string
          price: number
          monthly_price: number
          stock_quantity: number
          category: string
          brand: string
          brand_translation: string
          category_translation: string
          image_url: string
          sku: string
          weight: number
          dimensions: string
          warranty_period: string
          in_stock: boolean
          company_id: string
          created_at: string
          updated_at: string
          variant_combination_prices: Json
        }[]
      }
      get_related_blog_posts: {
        Args: { post_id: string; limit_count?: number }
        Returns: {
          author_avatar: string | null
          author_name: string | null
          author_role: string | null
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          read_time: string | null
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_template_for_offer: {
        Args: {
          p_company_id: string
          p_offer_type?: string
          p_template_category?: string
        }
        Returns: {
          template_id: string
          name: string
          template_file_url: string
          field_mappings: Json
          company_data: Json
        }[]
      }
      get_user_client_associations: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          client_id: string
          association_type: string
          created_at: string
        }[]
      }
      get_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_id_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          permission_name: string
          permission_description: string
          module: string
          action: string
          granted: boolean
          expires_at: string
        }[]
      }
      get_user_profile_with_associations: {
        Args: { user_id: string }
        Returns: Json
      }
      get_user_trial_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_trial: boolean
          trial_ends_at: string
          days_remaining: number
          company_name: string
          prospect_email: string
        }[]
      }
      group_products_by_sku: {
        Args: Record<PropertyKey, never>
        Returns: {
          parent_id: string
          parent_name: string
          parent_sku: string
          variants_count: number
          variation_attributes: Json
        }[]
      }
      immediate_global_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      initialize_new_company: {
        Args: { p_company_id: string; p_company_name: string }
        Returns: boolean
      }
      insert_offer_equipment_attributes_secure: {
        Args: { p_equipment_id: string; p_attributes: Json }
        Returns: undefined
      }
      insert_offer_equipment_secure: {
        Args: {
          p_offer_id: string
          p_title: string
          p_purchase_price: number
          p_quantity: number
          p_margin: number
          p_monthly_payment?: number
          p_serial_number?: string
        }
        Returns: string
      }
      insert_offer_equipment_specifications_secure: {
        Args: { p_equipment_id: string; p_specifications: Json }
        Returns: undefined
      }
      insert_postal_codes_bulk: {
        Args: { p_country_code: string; p_postal_codes: Json }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_optimized: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_or_ambassador: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_or_ambassador_v2: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_v2: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_ambassador: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_company_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_company_chat_available: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      is_saas_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_same_company: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      link_client_to_ambassador_secure: {
        Args: { p_user_id: string; p_client_id: string }
        Returns: boolean
      }
      log_ambassador_activity: {
        Args: {
          p_ambassador_id: string
          p_action_type: string
          p_description: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: string
      }
      mark_clients_as_duplicates: {
        Args: { client_ids: string[]; main_client_id: string }
        Returns: boolean
      }
      organize_product_variants: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_admin_pending_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      render_email_template: {
        Args: { template_content: string; variables: Json }
        Returns: string
      }
      search_postal_codes: {
        Args: {
          search_query: string
          country_filter?: string
          result_limit?: number
        }
        Returns: {
          postal_code: string
          city: string
          region: string
          country_code: string
          country_name: string
        }[]
      }
      sign_offer_public: {
        Args: {
          p_offer_id: string
          p_signature_data: string
          p_signer_name: string
          p_signer_ip?: string
        }
        Returns: boolean
      }
      unlink_client_from_ambassador_secure: {
        Args: { p_user_id: string; p_client_id: string }
        Returns: boolean
      }
      update_ambassador_commission_level: {
        Args: { ambassador_id: string; commission_level_id: string }
        Returns: undefined
      }
      update_brand: {
        Args: {
          original_name: string
          new_name: string
          new_translation: string
        }
        Returns: {
          company_id: string
          created_at: string
          id: string
          image_search_patterns: Json | null
          name: string
          translation: string
          updated_at: string
          website_url: string | null
        }
      }
      update_client_securely: {
        Args: { p_client_id: string; p_updates: Json }
        Returns: boolean
      }
      update_client_user_account: {
        Args: { client_id: string; user_id: string }
        Returns: boolean
      }
      update_company_user: {
        Args: {
          p_user_id: string
          p_first_name: string
          p_last_name: string
          p_role: string
          p_company_id?: string
        }
        Returns: boolean
      }
      update_offer_margins: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_product_attributes: {
        Args: { p_product_id: string; p_variation_attributes: Json }
        Returns: undefined
      }
      user_has_permission: {
        Args: { p_user_id: string; p_permission_name: string }
        Returns: boolean
      }
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
  public: {
    Enums: {},
  },
} as const
