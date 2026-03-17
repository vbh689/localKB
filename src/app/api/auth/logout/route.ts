import { parse } from "cookie";
import { NextResponse } from "next/server";
import { deleteSessionByToken, clearSessionCookie } from "@/lib/auth/session";
import { getConfig } from "@/lib/config";

export async function POST(request: Request) {
  const { SESSION_COOKIE_NAME } = getConfig();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = parse(cookieHeader)[SESSION_COOKIE_NAME];

  if (token) {
    await deleteSessionByToken(token);
  }

  const response = NextResponse.json({
    success: true,
  });

  response.headers.set("Set-Cookie", clearSessionCookie());

  return response;
}
