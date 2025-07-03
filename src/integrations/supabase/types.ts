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
          company_id: string
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
          company_id?: string
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
          company_id: string
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          has_different_shipping_address: boolean | null
          has_user_account: boolean | null
          id: string
          is_ambassador_client: boolean | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
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
          company_id: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          has_different_shipping_address?: boolean | null
          has_user_account?: boolean | null
          id?: string
          is_ambassador_client?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
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
          company_id?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          has_different_shipping_address?: boolean | null
          has_user_account?: boolean | null
          id?: string
          is_ambassador_client?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
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
      companies: {
        Row: {
          accent_color: string | null
          created_at: string
          custom_domain: string | null
          favicon_url: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          modules_enabled: string[] | null
          name: string
          plan: string
          primary_color: string | null
          secondary_color: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          modules_enabled?: string[] | null
          name: string
          plan?: string
          primary_color?: string | null
          secondary_color?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          modules_enabled?: string[] | null
          name?: string
          plan?: string
          primary_color?: string | null
          secondary_color?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_customizations: {
        Row: {
          accent_color: string | null
          company_id: string
          company_name: string | null
          created_at: string
          custom_domain: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
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
        }
        Insert: {
          activated_at?: string | null
          company_id?: string | null
          enabled?: boolean | null
          id?: string
          module_id?: string | null
        }
        Update: {
          activated_at?: string | null
          company_id?: string | null
          enabled?: boolean | null
          id?: string
          module_id?: string | null
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
          margin: number
          monthly_payment: number | null
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
          margin?: number
          monthly_payment?: number | null
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
          margin?: number
          monthly_payment?: number | null
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
      email_templates: {
        Row: {
          active: boolean
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
          created_at?: string
          html_content?: string
          id?: number
          name?: string
          subject?: string
          text_content?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
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
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
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
          clients_count: number | null
          commission_level_id: string | null
          company_id: string
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
          company_id: string
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
          company_id?: string
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
          admin_only: boolean | null
          attributes: Json | null
          brand: string | null
          category: string | null
          company_id: string
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
          admin_only?: boolean | null
          attributes?: Json | null
          brand?: string | null
          category?: string | null
          company_id: string
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
          admin_only?: boolean | null
          attributes?: Json | null
          brand?: string | null
          category?: string | null
          company_id?: string
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
        Relationships: [
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
          company_id: string
          created_at: string | null
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
          company_id: string
          created_at?: string | null
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
          company_id?: string
          created_at?: string | null
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
      [_ in never]: never
    }
    Functions: {
      add_brand: {
        Args: { brand_name: string; brand_translation: string }
        Returns: {
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
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
      count_ambassador_clients_secure: {
        Args: { p_user_id: string }
        Returns: number
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
      create_contract_workflow_log: {
        Args: {
          p_contract_id: string
          p_previous_status: string
          p_new_status: string
          p_reason?: string
        }
        Returns: string
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
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
        }[]
      }
      get_company_dashboard_metrics: {
        Args: { p_company_id: string; time_filter?: string }
        Returns: {
          total_revenue: number
          total_clients: number
          total_offers: number
          total_contracts: number
          pending_offers: number
          active_contracts: number
          monthly_growth_revenue: number
          monthly_growth_clients: number
        }[]
      }
      get_company_recent_activity: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          activity_type: string
          activity_description: string
          entity_id: string
          entity_name: string
          created_at: string
          user_name: string
        }[]
      }
      get_company_users: {
        Args: { p_company_id: string; role_filter?: string }
        Returns: {
          user_id: string
          email: string
          first_name: string
          last_name: string
          role: string
          created_at: string
          last_sign_in_at: string
          has_user_account: boolean
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
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
      get_user_client_associations: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          user_email: string
          user_role: string
          client_id: string
          client_name: string
          client_email: string
          association_date: string
          status: string
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
      insert_offer_equipment_attributes_secure: {
        Args: { p_equipment_id: string; p_attributes: Json }
        Returns: boolean
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
        Returns: boolean
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
      is_same_company: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      link_client_to_ambassador_secure: {
        Args: { p_user_id: string; p_client_id: string }
        Returns: boolean
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
          created_at: string
          id: string
          name: string
          translation: string
          updated_at: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
