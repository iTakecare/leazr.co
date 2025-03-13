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
      client_tags: {
        Row: {
          client_id: string
          created_at: string | null
          tag_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          tag_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string
          country: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          postal_code: string | null
          status: string
          user_id: string
          vat_number: string | null
          vies_valid: boolean | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company: string
          country?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          postal_code?: string | null
          status?: string
          user_id: string
          vat_number?: string | null
          vies_valid?: boolean | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          postal_code?: string | null
          status?: string
          user_id?: string
          vat_number?: string | null
          vies_valid?: boolean | null
        }
        Relationships: []
      }
      collaborator_equipment: {
        Row: {
          collaborator_id: string | null
          created_at: string | null
          equipment_list: Json | null
          id: string
          quote_id: string | null
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string | null
          equipment_list?: Json | null
          id?: string
          quote_id?: string | null
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string | null
          equipment_list?: Json | null
          id?: string
          quote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_equipment_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_equipment_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          client_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string | null
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
      contact_history: {
        Row: {
          client_id: string | null
          contact_date: string | null
          created_at: string | null
          description: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          contact_date?: string | null
          created_at?: string | null
          description: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          contact_date?: string | null
          created_at?: string | null
          description?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          actual_delivery: string | null
          carrier: Database["public"]["Enums"]["shipping_carrier"]
          created_at: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery?: string | null
          carrier: Database["public"]["Enums"]["shipping_carrier"]
          created_at?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery?: string | null
          carrier?: Database["public"]["Enums"]["shipping_carrier"]
          created_at?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      follow_up_reminders: {
        Row: {
          client_id: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          coefficient: number
          created_at?: string | null
          id?: string
          leaser_id?: string | null
          max: number
          min: number
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
          active: boolean | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          active?: boolean | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          active?: boolean | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          client_id: string | null
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount: number
          client_email: string
          client_name: string
          coefficient: number
          commission: number
          created_at: string | null
          equipment_description: string
          id: string
          monthly_payment: number
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          client_email: string
          client_name: string
          coefficient: number
          commission: number
          created_at?: string | null
          equipment_description: string
          id?: string
          monthly_payment: number
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_email?: string
          client_name?: string
          coefficient?: number
          commission?: number
          created_at?: string | null
          equipment_description?: string
          id?: string
          monthly_payment?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_commission_ranges: {
        Row: {
          active: boolean | null
          commission_percentage: number
          created_at: string | null
          id: string
          max_amount: number
          min_amount: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          commission_percentage: number
          created_at?: string | null
          id?: string
          max_amount: number
          min_amount: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          commission_percentage?: number
          created_at?: string | null
          id?: string
          max_amount?: number
          min_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_commissions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          partner_id: string | null
          payment_date: string | null
          percentage: number
          quote_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          partner_id?: string | null
          payment_date?: string | null
          percentage: number
          quote_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          partner_id?: string | null
          payment_date?: string | null
          percentage?: number
          quote_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "partner_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_quotes: {
        Row: {
          client_company: string
          client_email: string
          client_name: string
          commission_amount: number
          commission_percentage: number
          created_at: string | null
          equipment_list: Json
          id: string
          monthly_payment: number
          partner_id: string | null
          remarks: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_company: string
          client_email: string
          client_name: string
          commission_amount: number
          commission_percentage: number
          created_at?: string | null
          equipment_list?: Json
          id?: string
          monthly_payment: number
          partner_id?: string | null
          remarks?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          client_company?: string
          client_email?: string
          client_name?: string
          commission_amount?: number
          commission_percentage?: number
          created_at?: string | null
          equipment_list?: Json
          id?: string
          monthly_payment?: number
          partner_id?: string | null
          remarks?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          brand: string
          category: string | null
          condition: string | null
          connectivity: string[] | null
          created_at: string | null
          description: string | null
          features: string[] | null
          id: string
          image_url: string | null
          is_variant: boolean | null
          monthly_price: number
          name: string
          parent_id: string | null
          price: number
          screen_size: string | null
          sku: string | null
          specifications: Json | null
          stock_quantity: number | null
          stock_status: string | null
          storage_path: string | null
          updated_at: string | null
          variant_attributes: Json | null
          warranty_info: string | null
        }
        Insert: {
          active?: boolean | null
          brand: string
          category?: string | null
          condition?: string | null
          connectivity?: string[] | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_variant?: boolean | null
          monthly_price: number
          name: string
          parent_id?: string | null
          price: number
          screen_size?: string | null
          sku?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          stock_status?: string | null
          storage_path?: string | null
          updated_at?: string | null
          variant_attributes?: Json | null
          warranty_info?: string | null
        }
        Update: {
          active?: boolean | null
          brand?: string
          category?: string | null
          condition?: string | null
          connectivity?: string[] | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_variant?: boolean | null
          monthly_price?: number
          name?: string
          parent_id?: string | null
          price?: number
          screen_size?: string | null
          sku?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          stock_status?: string | null
          storage_path?: string | null
          updated_at?: string | null
          variant_attributes?: Json | null
          warranty_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_documents: {
        Row: {
          id: string
          name: string
          notes: string | null
          quote_id: string | null
          status: string | null
          type: string
          uploaded_at: string | null
          url: string
        }
        Insert: {
          id?: string
          name: string
          notes?: string | null
          quote_id?: string | null
          status?: string | null
          type: string
          uploaded_at?: string | null
          url: string
        }
        Update: {
          id?: string
          name?: string
          notes?: string | null
          quote_id?: string | null
          status?: string | null
          type?: string
          uploaded_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string | null
          id: string
          leasing_price: number
          monthly_price: number
          product_id: string | null
          quantity: number
          quote_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          leasing_price: number
          monthly_price: number
          product_id?: string | null
          quantity: number
          quote_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          leasing_price?: number
          monthly_price?: number
          product_id?: string | null
          quantity?: number
          quote_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_serial_number_tags: {
        Row: {
          created_at: string | null
          serial_number_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          serial_number_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          serial_number_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_serial_number_tags_serial_number_id_fkey"
            columns: ["serial_number_id"]
            isOneToOne: false
            referencedRelation: "quote_serial_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_serial_number_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "equipment_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_serial_numbers: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          equipment_index: number
          id: string
          notes: string | null
          quote_id: string | null
          serial_number: string
          status: string | null
          type: Database["public"]["Enums"]["equipment_type"]
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          equipment_index: number
          id?: string
          notes?: string | null
          quote_id?: string | null
          serial_number: string
          status?: string | null
          type: Database["public"]["Enums"]["equipment_type"]
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          equipment_index?: number
          id?: string
          notes?: string | null
          quote_id?: string | null
          serial_number?: string
          status?: string | null
          type?: Database["public"]["Enums"]["equipment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "quote_serial_numbers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_serial_numbers_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_workflow_assignments: {
        Row: {
          active: boolean | null
          assigned_at: string | null
          assigned_by: string | null
          id: string
          quote_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          quote_id?: string | null
          status: Database["public"]["Enums"]["quote_status"]
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      quote_workflow_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          quote_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          quote_id?: string | null
          status: Database["public"]["Enums"]["quote_status"]
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_workflow_comments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_workflow_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          quote_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          step_number: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          quote_id?: string | null
          status: Database["public"]["Enums"]["quote_status"]
          step_number: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          quote_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_workflow_steps_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_workflows: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["quote_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["quote_status"] | null
          quote_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["quote_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["quote_status"] | null
          quote_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["quote_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["quote_status"] | null
          quote_id?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string
          created_at: string | null
          equipment_list: Json
          id: string
          last_status_change: string | null
          leaser_id: string | null
          remarks: string | null
          status: string
          total_monthly: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          equipment_list?: Json
          id?: string
          last_status_change?: string | null
          leaser_id?: string | null
          remarks?: string | null
          status?: string
          total_monthly?: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          equipment_list?: Json
          id?: string
          last_status_change?: string | null
          leaser_id?: string | null
          remarks?: string | null
          status?: string
          total_monthly?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_leaser_id_fkey"
            columns: ["leaser_id"]
            isOneToOne: false
            referencedRelation: "leasers"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string
          email_notifications: boolean | null
          first_name: string | null
          id: string
          is_admin: boolean | null
          is_partner: boolean | null
          language: string | null
          last_name: string | null
          push_notifications: boolean | null
          theme: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          email_notifications?: boolean | null
          first_name?: string | null
          id: string
          is_admin?: boolean | null
          is_partner?: boolean | null
          language?: string | null
          last_name?: string | null
          push_notifications?: boolean | null
          theme?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          email_notifications?: boolean | null
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_partner?: boolean | null
          language?: string | null
          last_name?: string | null
          push_notifications?: boolean | null
          theme?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_commission: {
        Args: {
          amount: number
        }
        Returns: {
          percentage: number
          commission: number
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_ambassador: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_partner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      delivery_status: "pending" | "in_transit" | "delivered" | "exception"
      equipment_type: "desktop" | "laptop" | "smartphone" | "tablet"
      quote_status:
        | "draft"
        | "pending_client"
        | "client_approved"
        | "internal_review"
        | "additional_info"
        | "rejected_internal"
        | "sent_to_leaser"
        | "leaser_review"
        | "leaser_approved"
        | "leaser_rejected"
        | "contract_sent"
        | "contract_signed"
        | "equipment_ordered"
        | "delivered"
        | "active"
        | "completed"
        | "cancelled"
        | "client_no_response"
      shipping_carrier:
        | "itakecare"
        | "bpost"
        | "postnl"
        | "ups"
        | "dpd"
        | "fedex"
        | "chronopost"
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
