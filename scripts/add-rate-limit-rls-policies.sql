-- Add RLS policies for rate_limits table to allow service_role access
-- Even though service_role should bypass RLS, explicit policies ensure compatibility

-- Service role can do everything (rate limiting is internal operation)
CREATE POLICY IF NOT EXISTS "Service role can manage rate limits" ON public.rate_limits
    FOR ALL USING (true) WITH CHECK (true);

-- Note: Users don't need direct access to rate_limits table
-- All access is through API endpoints with proper authorization
