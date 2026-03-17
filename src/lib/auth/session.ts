import { randomBytes } from "node:crypto";
import { serialize } from "cookie";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getCookieOptions(expires: Date) {
  return {
    expires,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function createSessionCookie(token: string, expiresAt: Date) {
  const { SESSION_COOKIE_NAME } = getConfig();
  return serialize(SESSION_COOKIE_NAME, token, getCookieOptions(expiresAt));
}

export function clearSessionCookie() {
  const { SESSION_COOKIE_NAME } = getConfig();

  return serialize(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function getSessionFromRequest(request: NextRequest) {
  const { SESSION_COOKIE_NAME } = getConfig();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  await db.session.update({
    where: {
      id: session.id,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });

  return session;
}

export async function deleteSessionByToken(token: string) {
  await db.session.deleteMany({
    where: {
      token,
    },
  });
}

export async function getCurrentSession() {
  const { SESSION_COOKIE_NAME } = getConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return db.session.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
}

export async function requireUserSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRoles(roles: Role[]) {
  const session = await requireUserSession();

  if (!roles.includes(session.user.role)) {
    redirect("/");
  }

  return session;
}
