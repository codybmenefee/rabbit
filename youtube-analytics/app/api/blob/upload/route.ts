import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { put } from '@vercel/blob'
import { authOptions, validateBlobConfig } from '@/lib/auth'

// Configure route to never cache uploads
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(request: NextRequest) {
  try {
    // Validate Blob configuration
    if (!validateBlobConfig()) {
      console.error('Vercel Blob not configured properly')
      return NextResponse.json({ 
        error: 'Storage service not configured', 
        details: 'Vercel Blob storage is not properly configured on the server'
      }, { status: 503 })
    }

    // Get session to verify authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { path, data } = await request.json()
    
    if (!path || !data) {
      return NextResponse.json({ error: 'Missing path or data' }, { status: 400 })
    }

    // Verify the path belongs to the authenticated user
    const expectedPrefix = `users/${session.user.id}/`
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log(`Attempting to upload blob to: ${path}`)
    
    // Upload to Vercel Blob with error handling
    // Allow overwriting for master.json and aggregations since they need to be updated
    const blob = await put(path, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true, // Allow overwriting existing files (needed for master.json updates)
      cacheControlMaxAge: 0, // Don't cache user data
      token: process.env.BLOB_READ_WRITE_TOKEN
    })

    // Return upload response with cache invalidation
    const response = NextResponse.json({ 
      url: blob.url,
      uploadedAt: blob.uploadedAt,
      pathname: blob.pathname,
      size: blob.size
    })
    
    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error: any) {
    console.error('Blob upload error:', error)
    
    // Handle specific Blob errors
    if (error?.message?.includes('token') || error?.message?.includes('unauthorized')) {
      return NextResponse.json({ 
        error: 'Storage authentication failed',
        details: 'Failed to authenticate with Vercel Blob storage'
      }, { status: 503 })
    }
    
    if (error?.message?.includes('limit') || error?.message?.includes('quota')) {
      return NextResponse.json({ 
        error: 'Storage limit exceeded',
        details: 'Vercel Blob storage limit has been reached'
      }, { status: 507 })
    }
    
    // Provide more detailed error information
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}