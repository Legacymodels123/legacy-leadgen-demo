import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    cloud: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    supabasePublic: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
