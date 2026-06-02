import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isValidUrl = url && (url.startsWith('http://') || url.startsWith('https://'));
  const safeUrl = isValidUrl ? url : 'https://placeholder-project.supabase.co';
  const safeKey = isValidUrl ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : 'placeholder-anon-key';

  return createBrowserClient(safeUrl, safeKey);
}
