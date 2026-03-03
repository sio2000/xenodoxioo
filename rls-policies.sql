-- ========================================
-- RLS POLICIES FOR PRODUCTION SYSTEM
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_blockages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Admins can manage all users
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- PROPERTIES TABLE POLICIES
-- ========================================

-- Public can view active properties
CREATE POLICY "Public can view active properties" ON properties
  FOR SELECT USING (is_active = true);

-- Admins can manage all properties
CREATE POLICY "Admins can manage all properties" ON properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- UNITS TABLE POLICIES
-- ========================================

-- Public can view active units
CREATE POLICY "Public can view active units" ON units
  FOR SELECT USING (is_active = true);

-- Admins can manage all units
CREATE POLICY "Admins can manage all units" ON units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- BOOKINGS TABLE POLICIES
-- ========================================

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (user_id::uuid = auth.uid());

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Users can create bookings
CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (user_id::uuid = auth.uid());

-- Admins can manage all bookings
CREATE POLICY "Admins can manage all bookings" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- PAYMENTS TABLE POLICIES
-- ========================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (user_id::uuid = auth.uid());

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- COUPONS TABLE POLICIES
-- ========================================

-- Public can view active coupons
CREATE POLICY "Public can view active coupons" ON coupons
  FOR SELECT USING (is_active = true);

-- Admins can manage all coupons
CREATE POLICY "Admins can manage all coupons" ON coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- REVIEWS TABLE POLICIES
-- ========================================

-- Public can view all reviews
CREATE POLICY "Public can view reviews" ON reviews
  FOR SELECT USING (true);

-- Users can create reviews for their own bookings
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    user_id::uuid = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = reviews.booking_id 
      AND bookings.user_id::uuid = auth.uid()
      AND bookings.status = 'COMPLETED'
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (user_id::uuid = auth.uid());

-- ========================================
-- AMENITIES TABLE POLICIES
-- ========================================

-- Public can view amenities
CREATE POLICY "Public can view amenities" ON amenities
  FOR SELECT USING (true);

-- Admins can manage all amenities
CREATE POLICY "Admins can manage all amenities" ON amenities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- TAX SETTINGS TABLE POLICIES
-- ========================================

-- Public can view active tax settings
CREATE POLICY "Public can view tax settings" ON tax_settings
  FOR SELECT USING (is_active = true);

-- Admins can manage tax settings
CREATE POLICY "Admins can manage tax settings" ON tax_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- SEASONAL PRICING TABLE POLICIES
-- ========================================

-- Public can view seasonal pricing
CREATE POLICY "Public can view seasonal pricing" ON seasonal_pricing
  FOR SELECT USING (true);

-- Admins can manage seasonal pricing
CREATE POLICY "Admins can manage seasonal pricing" ON seasonal_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- DATE BLOCKAGES TABLE POLICIES
-- ========================================

-- Public can view date blockages (for availability checking)
CREATE POLICY "Public can view date blockages" ON date_blockages
  FOR SELECT USING (true);

-- Admins can manage date blockages
CREATE POLICY "Admins can manage date blockages" ON date_blockages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- SESSIONS & PASSWORD RESETS POLICIES
-- ========================================

-- Users can manage their own sessions
CREATE POLICY "Users can manage own sessions" ON sessions
  FOR ALL USING (user_id::uuid = auth.uid());

-- Users can manage their own password resets
CREATE POLICY "Users can manage own password resets" ON password_resets
  FOR ALL USING (user_id::uuid = auth.uid());

-- ========================================
-- ADMIN LOGS POLICIES
-- ========================================

-- Only admins can view admin logs
CREATE POLICY "Only admins can view admin logs" ON admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Only admins can create admin logs
CREATE POLICY "Only admins can create admin logs" ON admin_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- ========================================
-- EMAIL LOGS POLICIES
-- ========================================

-- Admins can view all email logs
CREATE POLICY "Admins can view email logs" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Admins can manage email logs
CREATE POLICY "Admins can manage email logs" ON email_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::uuid = auth.uid() 
      AND role = 'ADMIN'
    )
  );
