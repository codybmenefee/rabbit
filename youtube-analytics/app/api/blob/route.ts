import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { head } from '@vercel/blob'
import { authOptions, validateBlobConfig } from '@/lib/auth'

// Configure route to never cache user data
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
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
      console.log(`Attempting to retrieve blob: ${path}`)
      const blob = await head(path, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      })
      
      // Fetch the actual blob content to avoid CORS issues
      console.log(`Fetching blob content from: ${blob.url}`)
      const blobResponse = await fetch(blob.url)
      
      if (!blobResponse.ok) {
        throw new Error(`Failed to fetch blob content: ${blobResponse.status}`)
      }
      
      const content = await blobResponse.text()
      
      // Return the actual content instead of URL to avoid CORS issues
      const response = NextResponse.json({ 
        content: JSON.parse(content),
        lastModified: blob.uploadedAt,
        size: blob.size 
      })
      
      // Set cache control headers to prevent caching of user data
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('ETag', `"${blob.pathname}-${blob.uploadedAt}"`) // For cache validation
      
      return response
    } catch (blobError: any) {
      // Blob doesn't exist or other Blob-specific error
      console.error('Blob retrieval error:', blobError)
      
      if (blobError?.message?.includes('not found')) {
        const response = NextResponse.json({ 
          error: 'Blob not found',
          path: path 
        }, { status: 404 })
        response.headers.set('Cache-Control', 'no-store')
        return response
      }
      
      // Handle token/auth errors
      if (blobError?.message?.includes('token') || blobError?.message?.includes('unauthorized')) {
        return NextResponse.json({ 
          error: 'Storage authentication failed',
          details: 'Failed to authenticate with Vercel Blob storage'
        }, { status: 503 })
      }
      
      throw blobError // Re-throw for general error handler
    }

  } catch (error: any) {
    console.error('Blob API error:', error)
    
    // Provide more detailed error information
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}