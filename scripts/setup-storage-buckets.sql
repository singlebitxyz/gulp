-- =====================================================
-- SUPABASE STORAGE BUCKETS SETUP
-- =====================================================
-- This script creates the necessary storage buckets
-- for the Gulp product, including sources bucket for
-- file uploads (PDF, DOCX, TXT)
-- =====================================================

-- =====================================================
-- 1. CREATE SOURCES BUCKET
-- =====================================================

-- NOTE: Storage buckets must be created via Supabase Dashboard or API
-- Go to: Supabase Dashboard > Storage > Create Bucket
-- 
-- Bucket Configuration:
-- - Name: sources
-- - Public: false (private)
-- - File size limit: 50MB
-- - Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
--
-- After creating the bucket, run this script to set up policies.

-- Verify bucket exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sources') THEN
        RAISE WARNING 'Sources bucket does not exist. Please create it first via Supabase Dashboard > Storage > Create Bucket';
        RAISE NOTICE 'Bucket settings:';
        RAISE NOTICE '- Name: sources';
        RAISE NOTICE '- Public: false (private)';
        RAISE NOTICE '- File size limit: 50MB';
        RAISE NOTICE '- Allowed MIME types: PDF, DOCX, TXT';
    ELSE
        RAISE NOTICE 'Sources bucket found. Creating policies...';
    END IF;
END $$;

-- =====================================================
-- 2. CREATE STORAGE POLICIES FOR SOURCES BUCKET
-- =====================================================

-- Policy: Users can upload files to sources bucket
CREATE POLICY "Users can upload sources"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'sources' AND
    (storage.foldername(name))[1] = 'bots' AND
    EXISTS (
        SELECT 1 FROM public.bots
        WHERE id::text = (storage.foldername(name))[2]
        AND created_by = auth.uid()
    )
);

-- Policy: Users can view their own bot sources
CREATE POLICY "Users can view own bot sources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'sources' AND
    (storage.foldername(name))[1] = 'bots' AND
    EXISTS (
        SELECT 1 FROM public.bots
        WHERE id::text = (storage.foldername(name))[2]
        AND created_by = auth.uid()
    )
);

-- Policy: Users can delete their own bot sources
CREATE POLICY "Users can delete own bot sources"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'sources' AND
    (storage.foldername(name))[1] = 'bots' AND
    EXISTS (
        SELECT 1 FROM public.bots
        WHERE id::text = (storage.foldername(name))[2]
        AND created_by = auth.uid()
    )
);

-- Policy: Service role can manage all sources (for backend operations)
CREATE POLICY "Service role can manage all sources"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'sources')
WITH CHECK (bucket_id = 'sources');

-- =====================================================
-- 3. VERIFY SETUP
-- =====================================================

DO $$
BEGIN
    -- Check if bucket exists
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sources') THEN
        RAISE NOTICE '✓ Sources bucket found';
    ELSE
        RAISE WARNING '✗ Sources bucket NOT FOUND';
        RAISE NOTICE 'Please create it via Supabase Dashboard > Storage > Create Bucket';
        RAISE NOTICE 'Required settings:';
        RAISE NOTICE '  - Name: sources';
        RAISE NOTICE '  - Public: false (private)';
        RAISE NOTICE '  - File size limit: 50MB';
        RAISE NOTICE '  - Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain';
    END IF;
    
    -- Check policies
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname = 'Users can upload sources'
    ) THEN
        RAISE NOTICE '✓ Storage policies created successfully!';
    ELSE
        RAISE WARNING '✗ Storage policies may not have been created. Please check manually.';
    END IF;
END $$;

-- =====================================================
-- SCRIPT COMPLETION
-- =====================================================

-- Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Storage buckets setup completed!';
    RAISE NOTICE 'Features included:';
    RAISE NOTICE '- Sources bucket for file uploads (PDF, DOCX, TXT)';
    RAISE NOTICE '- 50MB file size limit per file';
    RAISE NOTICE '- Private bucket (authentication required)';
    RAISE NOTICE '- RLS policies for user access control';
    RAISE NOTICE '- Service role access for backend operations';
    RAISE NOTICE '';
    RAISE NOTICE 'Storage path structure:';
    RAISE NOTICE 'bots/{bot_id}/sources/{source_id}/{filename}';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify bucket exists in Supabase Dashboard > Storage';
    RAISE NOTICE '2. Test file upload via API';
    RAISE NOTICE '3. Verify RLS policies are working correctly';
END $$;

