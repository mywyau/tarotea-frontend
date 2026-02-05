import { createRemoteJWKSet, jwtVerify } from 'jose'

const auth0Domain = process.env.AUTH0_DOMAIN!
const auth0Audience = process.env.AUTH0_AUDIENCE!

/* ------------------------------------------------------------------ */
/* Token verification (used for authenticated requests from frontend) */
/* ------------------------------------------------------------------ */

const jwks = createRemoteJWKSet(
  new URL(`https://${auth0Domain}/.well-known/jwks.json`)
)

export async function verifyAuth0Token(token: string) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://${auth0Domain}/`,
    audience: auth0Audience
  })

  return payload
}

/* ------------------------------------------------ */
/* Auth0 Management API token (server → Auth0 only) */
/* ------------------------------------------------ */

let cachedManagementToken: {
  token: string
  expiresAt: number
} | null = null

async function getManagementToken(): Promise<string> {
  if (
    cachedManagementToken &&
    cachedManagementToken.expiresAt > Date.now()
  ) {
    return cachedManagementToken.token
  }

  const res = await fetch(
    `https://${auth0Domain}/oauth/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_MGMT_CLIENT_ID,
        client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
        audience: `https://${auth0Domain}/api/v2/`,
        grant_type: 'client_credentials'
      })
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Failed to fetch Auth0 management token (${res.status}): ${text}`
    )
  }

  const { access_token, expires_in } = await res.json()

  cachedManagementToken = {
    token: access_token,
    // refresh 60s early
    expiresAt: Date.now() + expires_in * 1000 - 60_000
  }

  return access_token
}

/* ---------------------------- */
/* Delete Auth0 user (GDPR-safe) */
/* ---------------------------- */

export async function deleteAuth0User(auth0UserId: string): Promise<void> {
  if (!auth0UserId) {
    throw new Error('Missing Auth0 user id')
  }

  const token = await getManagementToken()

  const res = await fetch(
    `https://${auth0Domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  // Already deleted → treat as success (idempotent)
  if (res.status === 404) {
    return
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Failed to delete Auth0 user (${res.status}): ${text}`
    )
  }
}
