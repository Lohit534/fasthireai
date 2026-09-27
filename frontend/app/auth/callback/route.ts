import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Handle token_hash from OTP email template
  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });
    if (!error) {
      let protocol = requestUrl.protocol;
      if (!requestUrl.hostname.includes("localhost")) {
        protocol = "https:";
      }
      const redirectUrl = `${protocol}//${requestUrl.host}${next}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Handle code from PKCE flow
  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let protocol = requestUrl.protocol;
      if (!requestUrl.hostname.includes("localhost")) {
        protocol = "https:";
      }
      const redirectUrl = `${protocol}//${requestUrl.host}${next}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // return the user to dashboard or auth-code-error page
  // Redirect to dashboard anyway if we are using the mock mode
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  if (supabaseUrl.includes("placeholder-project")) {
    let protocol = requestUrl.protocol;
    if (!requestUrl.hostname.includes("localhost")) {
      protocol = "https:";
    }
    const redirectUrl = `${protocol}//${requestUrl.host}${next}`;
    return NextResponse.redirect(redirectUrl);
  }

  let protocol = requestUrl.protocol;
  if (!requestUrl.hostname.includes("localhost")) {
    protocol = "https:";
  }
  const errorRedirectUrl = `${protocol}//${requestUrl.host}/auth/login?error=auth-code-error`;
  return NextResponse.redirect(errorRedirectUrl);
}
