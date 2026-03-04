-- Connect to supabase and run this schema

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Create table if not exists (Basic structure)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    roll_number TEXT UNIQUE NOT NULL,
    college TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    face_embedding vector(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    check_in_status BOOLEAN DEFAULT false
);

-- 2. ADD MISSING COLUMNS (Ensures existing tables are updated)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS synced_from_offline BOOLEAN DEFAULT false;

-- 3. RELOAD SCHEMA CACHE (Crutial to fix the "column not found" error)
NOTIFY pgrst, 'reload schema';

-- Index for fast roll_number lookups
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students (roll_number);

-- Index for college
CREATE INDEX IF NOT EXISTS idx_students_college ON public.students (college);

-- Vector index for face embedding (ivfflat is commonly used, requires some data to build but works well)
-- 128 dimensions for face-api.js embeddings. (MediaPipe is usually 128 as well, or 512 depending on model)
CREATE INDEX IF NOT EXISTS idx_students_face_embedding ON public.students USING ivfflat (face_embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (update to match your exact setup)
-- Allow all reads
CREATE POLICY "Allow anon read access" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access" ON public.students FOR UPDATE USING (true);

-- Function to check face duplicates
CREATE OR REPLACE FUNCTION match_face_embedding(
  query_embedding vector(128),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  full_name text,
  roll_number text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    full_name,
    roll_number,
    1 - (students.face_embedding <=> query_embedding) AS similarity
  FROM students
  WHERE 1 - (students.face_embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ==========================================
-- STORAGE SETUP (Run this in SQL Editor)
-- ==========================================

-- 1. Create a bucket for student photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set Storage Policies (Idempotent: Drop before Create)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Anon Upload Access" ON storage.objects;
CREATE POLICY "Anon Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Anon Update Access" ON storage.objects;
CREATE POLICY "Anon Update Access" ON storage.objects FOR UPDATE USING (bucket_id = 'student-photos');

-- ==========================================
-- TESTING UTILITIES
-- ==========================================
-- To clear data for fresh testing, run:
-- TRUNCATE public.students;
-- DELETE FROM storage.objects WHERE bucket_id = 'student-photos';
