import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { serializeUser } from "@/lib/auth/user";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    logError("api.auth.me", "Session lookup failed.", error);

    return NextResponse.json(
      {
        error: "Session service temporarily unavailable.",
      },
      {
        status: 500,
      },
    );
  }
}
