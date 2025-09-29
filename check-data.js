const { ConvexHttpClient } = require('convex/browser')
const { api } = require('./convex/_generated/api.js')

async function checkData() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

  try {
    console.log('Checking uploads...')
    const uploads = await convex.query(api.uploads.getByUser, {})
    console.log('Uploads:', uploads)

    if (uploads.length > 0) {
      console.log('\nChecking watch_events...')
      const events = await convex.query(api.watch_events.getByUser, {})
      console.log('Watch events (first 3):', events.slice(0, 3))
      console.log('Total events:', events.length)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

checkData()
