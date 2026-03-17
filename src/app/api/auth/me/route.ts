import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { serializeUser } from "@/lib/auth/user";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthenticated.",
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    user: serializeUser(session.user),
  });
}

