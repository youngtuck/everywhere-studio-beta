# Custom Auth Domain Setup

## Problem
During Google OAuth, users see "continue to aznryftfcpwldzvashzl.supabase.co" which exposes the raw Supabase project ID and undermines trust.

## Solution
Configure a custom domain for Supabase Auth so the consent screen shows a branded domain instead.

### Steps:
1. Go to Supabase Dashboard > Project Settings > Custom Domains
2. Add a custom domain (e.g., `auth.everywherestudio.com`)
3. Add the required DNS records (CNAME) to your domain registrar
4. Wait for SSL certificate provisioning (usually <10 minutes)
5. Update the Google OAuth consent screen in Google Cloud Console:
   - Authorized redirect URIs: change `https://aznryftfcpwldzvashzl.supabase.co/auth/v1/callback` to `https://auth.everywherestudio.com/auth/v1/callback`
6. Update `src/lib/supabase.ts` if the Supabase URL is hardcoded there

### Environment Variable
If using VITE_SUPABASE_URL, update it in Vercel environment variables to point to the custom domain.

### Verification
After setup, test Google OAuth flow. The consent screen should show "continue to auth.everywherestudio.com" instead of the raw project ID.

### Note
In `src/pages/AuthPage.tsx`, the `handleGoogleSignIn` function uses `window.location.origin` for the redirect. This is correct and does not need to change. The fix is entirely on the Supabase/Google Cloud side.
