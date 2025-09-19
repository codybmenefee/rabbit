'use client'

import { motion } from 'framer-motion'
import { Bell, Search, Calendar, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card border-b border-white/10 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex flex-1 items-center">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search insights, trends, creators..."
              className="w-full rounded-lg bg-background/50 py-2 pl-10 pr-4 text-sm backdrop-blur-sm border border-white/10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Date Range Picker */}
          <Button variant="outline" size="sm" className="hidden md:flex">
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 days
          </Button>

          {/* Upload Button */}
          <Button size="sm" className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90">
            <Upload className="mr-2 h-4 w-4" />
            Upload Data
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          </Button>

          {/* Profile */}
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-pink-500 animate-float" />
        </div>
      </div>
    </motion.header>
  )
}