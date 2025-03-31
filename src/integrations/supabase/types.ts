export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      ambassador_commissions: {
        Row: {
          ambassador_id: string
          amount: number
          client_id: string | null
          client_name: string
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          status: string
        }
        Insert: {
          ambassador_id: string
          amount: number
          client_id?: string | null
          client_name: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          status?: string
        }
        Update: {
          ambassador_id?: string
          amount?: number
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_commissions_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_commissions_client_id_fkey"
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
          country: string | null
          created_at: string | null
          email: string
          has_user_account: boolean | null
          id: string
          last_commission: number | null
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
          country?: string | null
          created_at?: string | null
          email: string
          has_user_account?: boolean | null
          id?: string
          last_commission?: number | null
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
          country?: string | null
          created_at?: string | null
          email?: string
          has_user_account?: boolean | null
          id?: string
          last_commission?: number | null
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
            foreignKeyName: "ambassadors_pdf_template_id_fkey"
            columns: ["pdf_template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          translation: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          translation?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          translation: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          translation?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          has_user_account: boolean | null
          id: string
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
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          has_user_account?: boolean | null
          id?: string
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
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          has_user_account?: boolean | null
          id?: string
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
        Relationships: []
      }
      collaborators: {
        Row: {
          client_id: string
          created_at: string
          department: string | null
          email: string | null
          id: string
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
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_rates: {
        Row: {
          commission_level_id: string
          created_at: string
          id: string
          max_amount: number
          min_amount: number
          rate: number
          updated_at: string
        }
        Insert: {
          commission_level_id: string
          created_at?: string
          id?: string
          max_amount: number
          min_amount: number
          rate: number
          updated_at?: string
        }
        Update: {
          commission_level_id?: string
          created_at?: string
          id?: string
          max_amount?: number
          min_amount?: number
          rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rates_level_id_fkey"
            columns: ["commission_level_id"]
            isOneToOne: false
            referencedRelation: "commission_levels"
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
          created_at: string
          delivery_carrier: string | null
          delivery_status: string | null
          equipment_description: string | null
          estimated_delivery: string | null
          id: string
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
          created_at?: string
          delivery_carrier?: string | null
          delivery_status?: string | null
          equipment_description?: string | null
          estimated_delivery?: string | null
          id?: string
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
          created_at?: string
          delivery_carrier?: string | null
          delivery_status?: string | null
          equipment_description?: string | null
          estimated_delivery?: string | null
          id?: string
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
            foreignKeyName: "contracts_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "admin_pending_requests"
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
      leaser_ranges: {
        Row: {
          coefficient: number
          created_at: string | null
          id: string
          leaser_id: string | null
          max: number
          min: number
          updated_at: string | null
        }
        Insert: {
          coefficient?: number
          created_at?: string | null
          id?: string
          leaser_id?: string | null
          max?: number
          min?: number
          updated_at?: string | null
        }
        Update: {
          coefficient?: number
          created_at?: string | null
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
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "admin_pending_requests"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "offer_notes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "admin_pending_requests"
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
        Relationships: []
      }
      offers: {
        Row: {
          amount: number
          client_email: string | null
          client_id: string | null
          client_name: string
          coefficient: number
          commission: number | null
          converted_to_contract: boolean | null
          created_at: string | null
          equipment_description: string | null
          id: string
          monthly_payment: number
          previous_status: string | null
          remarks: string | null
          signature_data: string | null
          signed_at: string | null
          signer_name: string | null
          status: string
          type: string | null
          updated_at: string | null
          user_id: string
          workflow_status: string | null
        }
        Insert: {
          amount?: number
          client_email?: string | null
          client_id?: string | null
          client_name: string
          coefficient?: number
          commission?: number | null
          converted_to_contract?: boolean | null
          created_at?: string | null
          equipment_description?: string | null
          id?: string
          monthly_payment?: number
          previous_status?: string | null
          remarks?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
          type?: string | null
          updated_at?: string | null
          user_id: string
          workflow_status?: string | null
        }
        Update: {
          amount?: number
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          coefficient?: number
          commission?: number | null
          converted_to_contract?: boolean | null
          created_at?: string | null
          equipment_description?: string | null
          id?: string
          monthly_payment?: number
          previous_status?: string | null
          remarks?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_name?: string | null
          status?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
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
        ]
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
          clients_count: number | null
          commission_level_id: string | null
          contact_name: string
          created_at: string | null
          email: string
          has_user_account: boolean | null
          id: string
          last_transaction: number | null
          name: string
          notes: string | null
          pdf_template_id: string | null
          phone: string | null
          revenue_total: number | null
          status: string
          type: string
          updated_at: string | null
          user_account_created_at: string | null
          user_id: string | null
        }
        Insert: {
          clients_count?: number | null
          commission_level_id?: string | null
          contact_name: string
          created_at?: string | null
          email: string
          has_user_account?: boolean | null
          id?: string
          last_transaction?: number | null
          name: string
          notes?: string | null
          pdf_template_id?: string | null
          phone?: string | null
          revenue_total?: number | null
          status?: string
          type: string
          updated_at?: string | null
          user_account_created_at?: string | null
          user_id?: string | null
        }
        Update: {
          clients_count?: number | null
          commission_level_id?: string | null
          contact_name?: string
          created_at?: string | null
          email?: string
          has_user_account?: boolean | null
          id?: string
          last_transaction?: number | null
          name?: string
          notes?: string | null
          pdf_template_id?: string | null
          phone?: string | null
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
            foreignKeyName: "partners_pdf_template_id_fkey"
            columns: ["pdf_template_id"]
            isOneToOne: false
            referencedRelation: "pdf_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_models: {
        Row: {
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
        Relationships: []
      }
      pdf_templates: {
        Row: {
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at: string
          fields: Json
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
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at?: string
          fields: Json
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
          companyAddress?: string
          companyContact?: string
          companyName?: string
          companySiret?: string
          created_at?: string
          fields?: Json
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
        Relationships: []
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
          attributes: Json | null
          brand: string | null
          category: string | null
          created_at: string | null
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
          is_variation: boolean | null
          model: string | null
          monthly_price: number | null
          name: string
          parent_id: string | null
          price: number
          sku: string | null
          specifications: Json | null
          stock: number | null
          updated_at: string | null
          variants_ids: string[] | null
          variation_attributes: Json | null
        }
        Insert: {
          active?: boolean | null
          attributes?: Json | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
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
          is_variation?: boolean | null
          model?: string | null
          monthly_price?: number | null
          name: string
          parent_id?: string | null
          price?: number
          sku?: string | null
          specifications?: Json | null
          stock?: number | null
          updated_at?: string | null
          variants_ids?: string[] | null
          variation_attributes?: Json | null
        }
        Update: {
          active?: boolean | null
          attributes?: Json | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
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
          is_variation?: boolean | null
          model?: string | null
          monthly_price?: number | null
          name?: string
          parent_id?: string | null
          price?: number
          sku?: string | null
          specifications?: Json | null
          stock?: number | null
          updated_at?: string | null
          variants_ids?: string[] | null
          variation_attributes?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          updated_at?: string | null
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
          created_at: string
          enabled: boolean
          from_email: string
          from_name: string
          host: string
          id: number
          password: string
          port: string
          secure: boolean
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          from_email: string
          from_name?: string
          host: string
          id: number
          password: string
          port?: string
          secure?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: number
          password?: string
          port?: string
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      woocommerce_configs: {
        Row: {
          consumer_key: string
          consumer_secret: string
          created_at: string | null
          id: string
          site_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consumer_key: string
          consumer_secret: string
          created_at?: string | null
          id?: string
          site_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consumer_key?: string
          consumer_secret?: string
          created_at?: string | null
          id?: string
          site_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
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
        Relationships: [
          {
            foreignKeyName: "offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_brand: {
        Args: {
          brand_name: string
          brand_translation: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
        }
      }
      calculate_total_revenue: {
        Args: {
          time_filter: string
        }
        Returns: {
          total_revenue: number
          gross_margin: number
          clients_count: number
        }[]
      }
      check_bucket_exists: {
        Args: {
          bucket_name: string
        }
        Returns: boolean
      }
      check_table_exists: {
        Args: {
          table_name: string
        }
        Returns: boolean
      }
      check_user_exists_by_email: {
        Args: {
          user_email: string
        }
        Returns: boolean
      }
      create_categories_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_client_as_ambassador: {
        Args: {
          client_data: Json
          ambassador_id: string
        }
        Returns: string
      }
      create_storage_bucket: {
        Args: {
          bucket_name: string
        }
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
        Args: {
          brand_name: string
        }
        Returns: boolean
      }
      ensure_site_settings_bucket: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      execute_sql: {
        Args: {
          sql: string
        }
        Returns: undefined
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
      get_brands: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_offer_by_id_public: {
        Args: {
          offer_id: string
        }
        Returns: {
          amount: number
          client_email: string | null
          client_id: string | null
          client_name: string
          coefficient: number
          commission: number | null
          converted_to_contract: boolean | null
          created_at: string | null
          equipment_description: string | null
          id: string
          monthly_payment: number
          previous_status: string | null
          remarks: string | null
          signature_data: string | null
          signed_at: string | null
          signer_name: string | null
          status: string
          type: string | null
          updated_at: string | null
          user_id: string
          workflow_status: string | null
        }[]
      }
      get_pdf_templates: {
        Args: Record<PropertyKey, never>
        Returns: {
          companyAddress: string
          companyContact: string
          companyName: string
          companySiret: string
          created_at: string
          fields: Json
          footerText: string
          headerText: string
          id: string
          logoURL: string | null
          name: string
          primaryColor: string
          secondaryColor: string
          templateImages: Json | null
          updated_at: string
        }[]
      }
      get_user_id_by_email: {
        Args: {
          user_email: string
        }
        Returns: string
      }
      get_user_profile_with_associations: {
        Args: {
          user_id: string
        }
        Returns: Json
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
      is_ambassador: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      organize_product_variants: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_ambassador_commission_level: {
        Args: {
          ambassador_id: string
          commission_level_id: string
        }
        Returns: undefined
      }
      update_brand: {
        Args: {
          original_name: string
          new_name: string
          new_translation: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
        }
      }
      update_product_attributes: {
        Args: {
          p_product_id: string
          p_variation_attributes: Json
        }
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
