import { createRemoteJWKSet, jwtVerify } from 'jose'

const auth0Domain = process.env.AUTH0_DOMAIN!
const auth0Audience = process.env.AUTH0_AUDIENCE!

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
