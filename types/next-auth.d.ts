import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role: string
      cafeSlug: string | null
      mustChangePassword: boolean
    }
  }
  interface User {
    role: string
    cafeSlug: string | null
    mustChangePassword: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    cafeSlug: string | null
    mustChangePassword: boolean
  }
}
