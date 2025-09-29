const { ConvexHttpClient } = require('convex/browser')
const { internal } = require('./convex/_generated/api.js')

async function resetUpload() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

  try {
    // Get all uploads
    const uploads = await convex.query(internal.uploads.listPendingInternal, { limit: 10 })
    console.log('All uploads:', uploads)

    // Reset any failed uploads to pending
    for (const upload of uploads) {
      if (upload.status === 'failed') {
        console.log(`Resetting upload ${upload._id} from failed to pending`)
        await convex.mutation(internal.uploads.markStatusInternal, {
          id: upload._id,
          status: 'pending'
        })
      }
    }

    console.log('Reset complete')
  } catch (error) {
    console.error('Error:', error)
  }
}

resetUpload()
