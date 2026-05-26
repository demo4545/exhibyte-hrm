import { cookies } from "next/headers";

import { ROLES } from "@/app/consts/common";
import { COOKIE, decodeSession } from "@/lib/session";
import type { SessionUser, UserRole } from "@/types/auth";

import { isSessionUserActive } from "./account-status";

/** Decode session cookie without checking account status. */
export async function getSessionFromCookie(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  return decodeSession(raw);
}

/** Active users only — returns null when inactive or not signed in. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionFromCookie();
  if (!user) return null;
  if (!(await isSessionUserActive(user))) return null;
  return user;
}

export function canManageEmployees(role: UserRole): boolean {
  return role === ROLES.HR_MANAGER || role === ROLES.SUPER_ADMIN;
}
