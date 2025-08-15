import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { head } from '@vercel/blob'
import GoogleProvider from 'next-auth/providers/google'

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, token }: any) => {
      if (session?.user) {
        session.user.id = token.sub!
      }
      return session
    },
    jwt: async ({ user, token }: any) => {
      if (user) {
        token.uid = user.id
      }
      return token
    },
  },
  session: {
    strategy: 'jwt' as const,
  },
}

export async function GET(request: NextRequest) {
  try {
    // Get session to verify authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    
    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // Verify the path belongs to the authenticated user
    const expectedPrefix = `users/${session.user.id}/`
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const blob = await head(path)
      
      // Return blob URL for frontend to fetch directly
      return NextResponse.json({ url: blob.url })
    } catch (error) {
      // Blob doesn't exist
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Blob API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}