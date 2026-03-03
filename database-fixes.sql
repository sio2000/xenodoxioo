-- ========================================
-- CRITICAL DATABASE FIXES FOR MIGRATION
-- ========================================

-- 1. ADD MISSING DESCRIPTION COLUMN TO TAX SETTINGS (if not exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tax_settings' AND column_name = 'description') THEN
        RAISE NOTICE 'description column already exists in tax_settings';
    ELSE
        ALTER TABLE tax_settings ADD COLUMN description TEXT;
        RAISE NOTICE 'description column added to tax_settings';
    END IF;
END $$;

-- Insert default tax settings safely (only insert if table is empty)
INSERT INTO tax_settings (tax_rate, additional_fees, is_active, description) 
SELECT 0.1500, 0, true, 'Default 15% tax rate'
WHERE NOT EXISTS (SELECT 1 FROM tax_settings LIMIT 1);

-- 2. FIX ENCODING ISSUES - Update database to handle UTF-8 properly
-- This requires database-level changes, handled via Supabase dashboard

-- 3. ADD MISSING INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons(code, is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_validity ON coupons(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_property_dates ON seasonal_pricing(property_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tax_settings_active ON tax_settings(is_active);

-- 4. ADD TRIGGER FOR TAX SETTINGS
CREATE TRIGGER update_tax_settings_updated_at 
BEFORE UPDATE ON tax_settings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
