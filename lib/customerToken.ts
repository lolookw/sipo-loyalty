import { SignJWT, jwtVerify } from 'jose'

function customerTokenSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is required to sign or verify customer tokens')
  return new TextEncoder().encode(secret)
}

export async function signCustomerToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(customerTokenSecret())
}

export async function verifyCustomerToken(token: string): Promise<string | null> {
  const secret = customerTokenSecret()

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.email as string
  } catch {
    return null
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
