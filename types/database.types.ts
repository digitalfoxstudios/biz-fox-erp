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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          organization_id: string
          published_at: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_name: string
          application_number: string
          assigned_to: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          service_name: string
          status: string
          submitted_on: string
          updated_at: string
        }
        Insert: {
          applicant_name: string
          application_number: string
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id: string
          service_name: string
          status?: string
          submitted_on?: string
          updated_at?: string
        }
        Update: {
          applicant_name?: string
          application_number?: string
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          service_name?: string
          status?: string
          submitted_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          acquired_on: string | null
          asset_code: string
          assigned_to: string | null
          category: string | null
          condition: string
          created_at: string
          created_by: string
          id: string
          location: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          acquired_on?: string | null
          asset_code: string
          assigned_to?: string | null
          category?: string | null
          condition?: string
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          acquired_on?: string | null
          asset_code?: string
          assigned_to?: string | null
          category?: string | null
          condition?: string
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          recorded_by: string
          remarks: string | null
          status: string
        }
        Insert: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          recorded_by?: string
          remarks?: string | null
          status?: string
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          recorded_by?: string
          remarks?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
          organization_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
          organization_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          approved_by: string | null
          attachment_path: string | null
          bill_date: string
          bill_number: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          payee_name: string
          purpose: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          attachment_path?: string | null
          bill_date?: string
          bill_number: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id: string
          payee_name: string
          purpose: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          attachment_path?: string | null
          bill_date?: string
          bill_number?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          payee_name?: string
          purpose?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number
          budget_head: string
          created_at: string
          created_by: string
          fiscal_year: string
          id: string
          notes: string | null
          organization_id: string
          revised_amount: number
        }
        Insert: {
          allocated_amount?: number
          budget_head: string
          created_at?: string
          created_by?: string
          fiscal_year: string
          id?: string
          notes?: string | null
          organization_id: string
          revised_amount?: number
        }
        Update: {
          allocated_amount?: number
          budget_head?: string
          created_at?: string
          created_by?: string
          fiscal_year?: string
          id?: string
          notes?: string | null
          organization_id?: string
          revised_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence: {
        Row: {
          created_at: string
          created_by: string
          direction: string
          id: string
          organization_id: string
          received_or_sent_on: string
          recipient_name: string | null
          reference_number: string
          sender_name: string | null
          status: string
          storage_path: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          direction: string
          id?: string
          organization_id: string
          received_or_sent_on?: string
          recipient_name?: string | null
          reference_number: string
          sender_name?: string | null
          status?: string
          storage_path?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          direction?: string
          id?: string
          organization_id?: string
          received_or_sent_on?: string
          recipient_name?: string | null
          reference_number?: string
          sender_name?: string | null
          status?: string
          storage_path?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alternate_phone: string | null
          billing_address: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          created_by: string
          customer_code: string
          customer_name: string
          customer_type: string
          email: string | null
          gstin: string | null
          id: string
          notes: string | null
          organization_id: string
          phone: string | null
          pincode: string | null
          shipping_address: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alternate_phone?: string | null
          billing_address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string
          customer_code: string
          customer_name: string
          customer_type?: string
          email?: string | null
          gstin?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          pincode?: string | null
          shipping_address?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alternate_phone?: string | null
          billing_address?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string
          customer_code?: string
          customer_name?: string
          customer_type?: string
          email?: string | null
          gstin?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          pincode?: string | null
          shipping_address?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          created_by: string
          description: string | null
          head_user_id: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          created_by: string
          date_of_joining: string | null
          department_id: string | null
          designation: string | null
          email: string | null
          employee_code: string
          employment_status: string
          full_name: string
          id: string
          notes: string | null
          organization_id: string
          phone: string | null
          staff_username: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          date_of_joining?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_code: string
          employment_status?: string
          full_name: string
          id?: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          staff_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          date_of_joining?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string
          employment_status?: string
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          staff_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      file_movements: {
        Row: {
          action: string
          created_by: string
          from_user_id: string | null
          id: string
          moved_at: string
          movement_note: string | null
          office_file_id: string
          organization_id: string
          to_user_id: string | null
        }
        Insert: {
          action?: string
          created_by?: string
          from_user_id?: string | null
          id?: string
          moved_at?: string
          movement_note?: string | null
          office_file_id: string
          organization_id: string
          to_user_id?: string | null
        }
        Update: {
          action?: string
          created_by?: string
          from_user_id?: string | null
          id?: string
          moved_at?: string
          movement_note?: string | null
          office_file_id?: string
          organization_id?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_movements_office_file_id_fkey"
            columns: ["office_file_id"]
            isOneToOne: false
            referencedRelation: "office_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          created_by: string
          description: string
          id: string
          organization_id: string
          reference_number: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          created_by?: string
          description: string
          id?: string
          organization_id: string
          reference_number?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          organization_id?: string
          reference_number?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grievances: {
        Row: {
          applicant_name: string
          assigned_to: string | null
          contact: string | null
          created_at: string
          description: string
          id: string
          organization_id: string
          resolved_at: string | null
          status: string
          subject: string
          tracking_number: string
          updated_at: string
        }
        Insert: {
          applicant_name: string
          assigned_to?: string | null
          contact?: string | null
          created_at?: string
          description: string
          id?: string
          organization_id: string
          resolved_at?: string | null
          status?: string
          subject: string
          tracking_number: string
          updated_at?: string
        }
        Update: {
          applicant_name?: string
          assigned_to?: string | null
          contact?: string | null
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          tracking_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grievances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string
          customer_id: string
          discount_amount: number
          due_date: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          line_items: Json
          notes: string | null
          organization_id: string
          payment_status: string
          place_of_supply: string | null
          quotation_id: string | null
          subtotal: number
          tax_amount: number
          terms: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          created_by?: string
          customer_id: string
          discount_amount?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          line_items?: Json
          notes?: string | null
          organization_id: string
          payment_status?: string
          place_of_supply?: string | null
          quotation_id?: string | null
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          discount_amount?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          line_items?: Json
          notes?: string | null
          organization_id?: string
          payment_status?: string
          place_of_supply?: string | null
          quotation_id?: string | null
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          organization_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          organization_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          organization_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string
          id: string
          location: string | null
          minutes: string | null
          organization_id: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          minutes?: string | null
          organization_id: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          minutes?: string | null
          organization_id?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_files: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          file_number: string
          id: string
          organization_id: string
          priority: string
          status: string
          storage_path: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          file_number: string
          id?: string
          organization_id: string
          priority?: string
          status?: string
          storage_path?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          file_number?: string
          id?: string
          organization_id?: string
          priority?: string
          status?: string
          storage_path?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
          project_code: string
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          project_code: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          project_code?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          discount_amount: number
          grand_total: number
          id: string
          line_items: Json
          notes: string | null
          organization_id: string
          quotation_date: string
          quotation_number: string
          status: string
          subject: string | null
          subtotal: number
          tax_amount: number
          terms: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          customer_id: string
          discount_amount?: number
          grand_total?: number
          id?: string
          line_items?: Json
          notes?: string | null
          organization_id: string
          quotation_date?: string
          quotation_number: string
          status?: string
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          discount_amount?: number
          grand_total?: number
          id?: string
          line_items?: Json
          notes?: string | null
          organization_id?: string
          quotation_date?: string
          quotation_number?: string
          status?: string
          subject?: string | null
          subtotal?: number
          tax_amount?: number
          terms?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          created_at: string
          id: string
          item_code: string
          item_name: string
          location: string | null
          organization_id: string
          quantity: number
          reorder_level: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_code: string
          item_name: string
          location?: string | null
          organization_id: string
          quantity?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_code?: string
          item_name?: string
          location?: string | null
          organization_id?: string
          quantity?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_by: string
          id: string
          moved_at: string
          movement_type: string
          notes: string | null
          organization_id: string
          quantity: number
          reference_number: string | null
          stock_item_id: string
        }
        Insert: {
          created_by?: string
          id?: string
          moved_at?: string
          movement_type: string
          notes?: string | null
          organization_id: string
          quantity: number
          reference_number?: string | null
          stock_item_id: string
        }
        Update: {
          created_by?: string
          id?: string
          moved_at?: string
          movement_type?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          reference_number?: string | null
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reports: {
        Row: {
          challenges: string | null
          created_at: string
          geo_accuracy_m: number | null
          geo_captured_at: string | null
          geo_latitude: number | null
          geo_longitude: number | null
          geo_status: string
          hours_spent: number | null
          id: string
          manager_feedback: string | null
          next_steps: string | null
          organization_id: string
          photo_paths: string[]
          report_date: string
          report_status: string
          submitted_by: string
          task_id: string
          task_status: string
          updated_at: string
          work_done: string
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          geo_accuracy_m?: number | null
          geo_captured_at?: string | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          geo_status?: string
          hours_spent?: number | null
          id?: string
          manager_feedback?: string | null
          next_steps?: string | null
          organization_id: string
          photo_paths?: string[]
          report_date?: string
          report_status?: string
          submitted_by: string
          task_id: string
          task_status?: string
          updated_at?: string
          work_done: string
        }
        Update: {
          challenges?: string | null
          created_at?: string
          geo_accuracy_m?: number | null
          geo_captured_at?: string | null
          geo_latitude?: number | null
          geo_longitude?: number | null
          geo_status?: string
          hours_spent?: number | null
          id?: string
          manager_feedback?: string | null
          next_steps?: string | null
          organization_id?: string
          photo_paths?: string[]
          report_date?: string
          report_status?: string
          submitted_by?: string
          task_id?: string
          task_status?: string
          updated_at?: string
          work_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          organization_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          narration: string
          organization_id: string
          status: string
          voucher_date: string
          voucher_number: string
          voucher_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string
          id?: string
          narration: string
          organization_id: string
          status?: string
          voucher_date?: string
          voucher_number: string
          voucher_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          narration?: string
          organization_id?: string
          status?: string
          voucher_date?: string
          voucher_number?: string
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
