import { createClient } from '@supabase/supabase-js'

// Next.js static builds will attempt to evaluate this file. 
// If environment variables are missing (e.g., heavily common in Vercel initial deploys), 
// we provide a placeholder to prevent the build from crashing, 
// and inform the user to set them up.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

if (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    console.warn('⚠️ Supabase environment variables are missing! Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment (e.g. Vercel Project Settings) and locally in .env.local')
}
