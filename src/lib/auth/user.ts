import type { Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

export function serializeUser(user: AuthUser) {
  return {
    email: user.email,
    id: user.id,
    role: user.role,
  };
}

export function canAccessAdmin(role: Role) {
  return role === "ADMIN" || role === "EDITOR";
}
