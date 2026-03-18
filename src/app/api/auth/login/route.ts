import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSessionCookie,
  createUserSession,
} from "@/lib/auth/session";
import { serializeUser } from "@/lib/auth/user";
import { logError } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid login payload.",
        },
        {
          status: 400,
        },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    const isPasswordValid = await verifyPassword(
      user.passwordHash,
      parsed.data.password,
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    const session = await createUserSession(user.id);
    const response = NextResponse.json({
      user: serializeUser(user),
    });

    response.headers.set(
      "Set-Cookie",
      createSessionCookie(session.token, session.expiresAt),
    );

    return response;
  } catch (error) {
    logError("api.auth.login", "Login request failed.", error);

    return NextResponse.json(
      {
        error: "Login service temporarily unavailable.",
      },
      {
        status: 500,
      },
    );
  }
}
