import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  let protocol = requestUrl.protocol;
  if (!requestUrl.hostname.includes("localhost")) {
    protocol = "https:";
  }
  const baseUrl = `${protocol}//${requestUrl.host}`;

  // 1. Handle token_hash from OTP email template
  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // 2. Handle code from PKCE flow
  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Redirect to dashboard anyway if mock mode
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (supabaseUrl.includes("placeholder-project")) {
    return NextResponse.redirect(`${baseUrl}${next}`);
  }

  return NextResponse.redirect(`${baseUrl}/auth/login?error=invalid-token`);
}
