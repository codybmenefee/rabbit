import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import { auth, currentUser } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Get user identity using Clerk auth
    const { userId, getToken } = await auth()
    console.log('Upload API - Clerk userId:', userId)
    if (!userId) {
      console.log('Upload API - No userId from Clerk auth')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the JWT token for Convex (using the 'convex' template)
    const convexToken = await getToken({ template: 'convex' })
    console.log('Upload API - Got Clerk JWT token for Convex template:', !!convexToken)

    let authToken: string
    if (!convexToken) {
      console.log('Upload API - Failed to get JWT token with convex template, trying default template')
      // Fallback to default token if convex template doesn't exist
      const defaultToken = await getToken()
      if (!defaultToken) {
        console.log('Upload API - Failed to get any JWT token from Clerk')
        return NextResponse.json(
          { error: 'Authentication failed - no JWT token' },
          { status: 401 }
        )
      }
      console.log('Upload API - Using default JWT token')
      authToken = defaultToken
    } else {
      console.log('Upload API - Using convex template JWT token')
      authToken = convexToken
    }

    // Initialize Convex client with authentication
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    convex.setAuth(authToken)

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const sanitizedName = file.name.trim().replace(/\s+/g, '-')
    const pathname = `uploads/${randomUUID()}-${sanitizedName}`

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type || undefined,
      addRandomSuffix: false,
    })

    const uploadData = {
      userId,
      filename: file.name,
      pathname: blob.pathname,
      url: blob.url,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'pending' as const,
    }

    console.log('Upload API - About to call Convex mutation with:', uploadData)

    // Store upload metadata in Convex
    const uploadId = await convex.mutation(api.uploads.create, uploadData)
    console.log('Upload API - Convex mutation succeeded, uploadId:', uploadId)

    return NextResponse.json({
      ...uploadData,
      uploadId,
    })
  } catch (error) {
    console.error('Upload API - Upload failed with error:', error)
    console.error('Upload API - Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

