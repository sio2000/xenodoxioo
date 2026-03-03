export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          password: string;
          role: string;
          status: string;
          is_email_verified: boolean;
          email_verification_token: string | null;
          password_reset_token: string | null;
          password_reset_expires: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          password: string;
          role?: string;
          status?: string;
          is_email_verified?: boolean;
          email_verification_token?: string | null;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          password?: string;
          role?: string;
          status?: string;
          is_email_verified?: boolean;
          email_verification_token?: string | null;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          refresh_token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          refresh_token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          refresh_token?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          name: string;
          description: string;
          location: string;
          city: string;
          country: string;
          slug: string;
          main_image: string;
          gallery_images: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          location: string;
          city: string;
          country: string;
          slug: string;
          main_image: string;
          gallery_images?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          location?: string;
          city?: string;
          country?: string;
          slug?: string;
          main_image?: string;
          gallery_images?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      units: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          slug: string;
          description: string | null;
          max_guests: number;
          bedrooms: number;
          bathrooms: number;
          beds: number;
          base_price: number;
          cleaning_fee: number;
          images: string;
          min_stay_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          slug: string;
          description?: string | null;
          max_guests: number;
          bedrooms: number;
          bathrooms: number;
          beds: number;
          base_price: number;
          cleaning_fee?: number;
          images?: string;
          min_stay_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          max_guests?: number;
          bedrooms?: number;
          bathrooms?: number;
          beds?: number;
          base_price?: number;
          cleaning_fee?: number;
          images?: string;
          min_stay_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          booking_number: string;
          unit_id: string;
          user_id: string | null;
          check_in_date: string;
          check_out_date: string;
          nights: number;
          base_price: number;
          total_nights: number;
          subtotal: number;
          cleaning_fee: number;
          taxes: number;
          discount_amount: number;
          deposit_amount: number;
          balance_amount: number;
          total_price: number;
          guests: number;
          guest_name: string;
          guest_email: string;
          guest_phone: string | null;
          total_paid: number;
          payment_status: string;
          deposit_paid: boolean;
          balance_paid: boolean;
          balance_charge_date: string | null;
          status: string;
          stripe_customer_id: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_number: string;
          unit_id: string;
          user_id?: string | null;
          check_in_date: string;
          check_out_date: string;
          nights: number;
          base_price: number;
          total_nights: number;
          subtotal: number;
          cleaning_fee?: number;
          taxes?: number;
          discount_amount?: number;
          deposit_amount?: number;
          balance_amount?: number;
          total_price: number;
          guests: number;
          guest_name: string;
          guest_email: string;
          guest_phone?: string | null;
          total_paid?: number;
          payment_status?: string;
          deposit_paid?: boolean;
          balance_paid?: boolean;
          balance_charge_date?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_number?: string;
          unit_id?: string;
          user_id?: string | null;
          check_in_date?: string;
          check_out_date?: string;
          nights?: number;
          base_price?: number;
          total_nights?: number;
          subtotal?: number;
          cleaning_fee?: number;
          taxes?: number;
          discount_amount?: number;
          deposit_amount?: number;
          balance_amount?: number;
          total_price?: number;
          guests?: number;
          guest_name?: string;
          guest_email?: string;
          guest_phone?: string | null;
          total_paid?: number;
          payment_status?: string;
          deposit_paid?: boolean;
          balance_paid?: boolean;
          balance_charge_date?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          amount: number;
          currency: string;
          payment_type: string;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          stripe_customer_id: string | null;
          status: string;
          processed_at: string | null;
          scheduled_for: string | null;
          failure_count: number;
          last_error: string | null;
          description: string | null;
          is_refundable: boolean;
          refund_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          amount: number;
          currency?: string;
          payment_type: string;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          processed_at?: string | null;
          scheduled_for?: string | null;
          failure_count?: number;
          last_error?: string | null;
          description?: string | null;
          is_refundable?: boolean;
          refund_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          payment_type?: string;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          processed_at?: string | null;
          scheduled_for?: string | null;
          failure_count?: number;
          last_error?: string | null;
          description?: string | null;
          is_refundable?: boolean;
          refund_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          description: string | null;
          changes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          description?: string | null;
          changes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          description?: string | null;
          changes?: string | null;
          created_at?: string;
        };
      };
      date_blockages: {
        Row: {
          id: string;
          property_id: string;
          start_date: string;
          end_date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          start_date: string;
          end_date: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          start_date?: string;
          end_date?: string;
          reason?: string | null;
          created_at?: string;
        };
      };
      seasonal_pricing: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          start_date: string;
          end_date: string;
          price_per_night: number;
          min_stay_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          start_date: string;
          end_date: string;
          price_per_night: number;
          min_stay_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          price_per_night?: number;
          min_stay_days?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          discount_type: string;
          discount_value: number;
          valid_from: string;
          valid_until: string;
          min_booking_amount: number | null;
          max_uses: number | null;
          used_count: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          discount_type: string;
          discount_value: number;
          valid_from: string;
          valid_until: string;
          min_booking_amount?: number | null;
          max_uses?: number | null;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          valid_from?: string;
          valid_until?: string;
          min_booking_amount?: number | null;
          max_uses?: number | null;
          used_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      amenities: {
        Row: {
          id: string;
          property_id: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
      };
      password_resets: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
