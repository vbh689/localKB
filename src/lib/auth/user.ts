import type { Role, UserStatus } from "generated/prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
};

export function serializeUser(user: AuthUser) {
  return {
    email: user.email,
    id: user.id,
    role: user.role,
    status: user.status,
  };
}

export function canAccessAdmin(role: Role) {
  return role === "ADMIN" || role === "EDITOR";
}

export function isActiveUser(status: UserStatus | null | undefined | string) {
  return status !== "INACTIVE";
}
