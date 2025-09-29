'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, 
  Users, 
  Settings, 
  Upload,
  Home,
  Search,
  Database,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const bottomNavigation = []

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false)
      }
    }
    
    if (isMobileOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isMobileOpen])

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/40 backdrop-blur-2xl border border-white/[0.08] text-white hover:bg-black/60 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "flex h-full w-56 flex-col bg-black/40 backdrop-blur-2xl border-r border-white/[0.08] transition-transform duration-300 lg:translate-x-0",
        "lg:relative fixed inset-y-0 left-0 z-50",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold text-white">YT Analytics</span>
          </div>
          
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 rounded text-gray-400 hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Search */}
      <div className="px-3 py-4">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm hover:bg-white/[0.08] hover:border-white/[0.12] transition-all">
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3" aria-label="Main navigation">
        <ul className="space-y-1" role="list">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:bg-white/[0.08]",
                    isActive
                      ? "bg-purple-500/10 text-white border border-purple-500/20"
                      : "text-gray-400 hover:text-gray-200"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon 
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive && "text-purple-400"
                    )} 
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-white/[0.08]">
        <nav aria-label="Secondary navigation">
          <ul className="space-y-1" role="list">
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      "hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:bg-white/[0.08]",
                      item.name === 'Import Data' 
                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30"
                        : isActive
                          ? "bg-purple-500/10 text-white border border-purple-500/20"
                          : "text-gray-400 hover:text-gray-200"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon 
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        item.name === 'Import Data' && "text-purple-400"
                      )} 
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Storage Indicator */}
      <div className="px-6 py-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-2 text-xs text-gray-500" role="status" aria-label="Data storage status">
          <Database className="w-3 h-3" aria-hidden="true" />
          <span>No data imported</span>
        </div>
      </div>
      </div>
    </>
  )
}