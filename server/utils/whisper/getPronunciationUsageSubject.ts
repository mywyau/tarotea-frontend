// server/utils/pronunciation/getPronunciationUsageSubject.ts
import { getCookie, getRequestIP, H3Event, setCookie } from "h3"
import { createHmac, randomUUID } from "node:crypto"

const DEVICE_COOKIE = "tt_pron_device"
const HASH_SECRET = process.env.USAGE_HASH_SECRET || "change-me-in-production"

function hashValue(value: string) {
  return createHmac("sha256", HASH_SECRET).update(value).digest("hex")
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getOrSetPronunciationDeviceId(event: H3Event) {
  let deviceId = getCookie(event, DEVICE_COOKIE)

  if (!deviceId) {
    deviceId = randomUUID()

    setCookie(event, DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  return deviceId
}

export function getPronunciationUsageSubject(
  event: H3Event,
  auth: {
    sub: string
    email?: string
    email_verified?: boolean
  },
  isPaid: boolean,
) {
  const deviceId = getOrSetPronunciationDeviceId(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown"
  const ipHash = hashValue(ip)

  if (isPaid) {
    return {
      kind: "paid" as const,
      key: `paid_user:${auth.sub}`,
      deviceId,
      ipHash,
    }
  }

  if (auth.email) {
    return {
      kind: "free_email" as const,
      key: `free_email:${hashValue(normalizeEmail(auth.email))}`,
      deviceId,
      ipHash,
    }
  }

  return {
    kind: "free_user" as const,
    key: `free_user:${auth.sub}`,
    deviceId,
    ipHash,
  }
}