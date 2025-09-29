import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Lazy load the upload component to reduce initial bundle size
const UploadPage = dynamic(() => import('@/components/upload/UploadForm'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-full px-4 py-10">
      <div className="max-w-xl w-full">
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/5 bg-slate-900/60">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-sm text-slate-400 mt-4">Loading upload form...</p>
          </div>
        </div>
      </div>
    </div>
  ),
})

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-full px-4 py-10">
        <div className="max-w-xl w-full">
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/5 bg-slate-900/60">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="text-sm text-slate-400 mt-4">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <UploadPage />
    </Suspense>
  )
}

