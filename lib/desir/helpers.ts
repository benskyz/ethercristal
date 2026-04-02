import crypto from "crypto"

export function isVipLevel(vipLevel: string | null | undefined): boolean {
  if (!vipLevel) return false
  return vipLevel !== "Standard"
}

export function normalizeGenderFilter(
  raw: unknown,
  isVip: boolean
): "all" | "male" | "female" {
  const value = typeof raw === "string" ? raw : "all"

  if (value === "male" || value === "female") {
    return isVip ? value : "all"
  }

  return "all"
}

export function makeDesireRoomCode(sessionId: number): string {
  return `desire-${sessionId}-${crypto.randomBytes(4).toString("hex")}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
