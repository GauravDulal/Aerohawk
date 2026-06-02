import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://'));
  const safeUrl = isValidUrl ? url : 'https://placeholder-project.supabase.co';
  const safeKey = isValidUrl ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : 'placeholder-anon-key';

  return createServerClient(
    safeUrl,
    safeKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
