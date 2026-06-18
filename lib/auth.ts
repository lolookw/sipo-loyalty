import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { normalizeEmail } from './utils'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 }, // 7 días
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = normalizeEmail(credentials.email)

        // 1. Super Admin (env vars — contraseña en texto plano, .env nunca se commitea)
        if (
          email === process.env.SUPER_ADMIN_EMAIL?.toLowerCase() &&
          credentials.password === process.env.SUPER_ADMIN_PASSWORD
        ) {
          return {
            id: 'superadmin',
            email,
            name: 'Super Admin',
            role: 'superadmin',
            cafeSlug: null,
            mustChangePassword: false,
          }
        }

        // 2. Owner (dueño de cafetería)
        const owner = await prisma.owner.findUnique({
          where: { email },
          include: { cafes: { select: { slug: true } } },
        })
        if (owner) {
          const valid = await bcrypt.compare(credentials.password, owner.password)
          if (!valid) return null
          return {
            id: owner.id,
            email: owner.email,
            name: owner.name,
            role: 'owner',
            cafeSlug: owner.cafes[0]?.slug ?? null,
            mustChangePassword: owner.mustChangePassword,
          }
        }

        // 3. CafeStaff (cajero)
        const staff = await prisma.cafeStaff.findUnique({
          where: { email },
          include: { cafe: { select: { slug: true } } },
        })
        if (staff) {
          const valid = await bcrypt.compare(credentials.password, staff.password)
          if (!valid) return null
          return {
            id: staff.id,
            email: staff.email,
            name: staff.name,
            role: staff.role,
            cafeSlug: staff.cafe.slug,
            mustChangePassword: staff.mustChangePassword,
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.cafeSlug = (user as any).cafeSlug
        token.mustChangePassword = (user as any).mustChangePassword
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.cafeSlug = token.cafeSlug as string | null
        session.user.mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    },
  },
}
