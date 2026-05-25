import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase OAuth callback.
 *
 * Exchanges the `?code=...` returned by the OAuth provider for a Supabase
 * session, enforces the @stayd.co email domain, then redirects either to the
 * originally requested page or `/work`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/work";
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    return redirectToLogin(url, errorDescription || errorParam);
  }

  if (!code) {
    return redirectToLogin(url, "Missing authorization code.");
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a context that disallows cookie writes
        }
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    return redirectToLogin(url, error?.message || "Sign-in failed.");
  }

  const email = data.user?.email?.toLowerCase() || "";
  if (!email.endsWith("@stayd.co")) {
    // Reject any non-stayd.co email: sign them out and bounce them back.
    await supabase.auth.signOut();
    return redirectToLogin(
      url,
      "Access is restricted to @stayd.co accounts. Please sign in with your Stayd Google account."
    );
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = next.startsWith("/") ? next : "/work";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

function redirectToLogin(currentUrl: URL, message: string): NextResponse {
  const redirectUrl = new URL(currentUrl.toString());
  redirectUrl.pathname = "/login";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("authError", message);
  return NextResponse.redirect(redirectUrl);
}
