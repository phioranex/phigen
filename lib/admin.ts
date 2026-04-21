export const ADMIN_USERNAME = process.env.ADMIN_GITHUB_USERNAME ?? "";

export function isAdmin(plan: string): boolean {
  return plan === "ADMIN";
}

export function hasPro(plan: string): boolean {
  return plan === "PRO" || plan === "ADMIN";
}
