'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Layers } from 'lucide-react'
import Link from 'next/link'

export function EmptyState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8 text-purple-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">No Topic Data Available</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Upload your YouTube watch history to discover insights about your content interests and viewing patterns across different topics.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          <Link href="/">
            <Button size="lg" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Import Your Data
            </Button>
          </Link>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>Google Takeout supported</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>Privacy-first processing</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}