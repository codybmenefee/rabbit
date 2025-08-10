'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users, 
  Settings, 
  Upload,
  Brain,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3, current: true },
  { name: 'Trends', href: '/trends', icon: TrendingUp, current: false },
  { name: 'Timeline', href: '/timeline', icon: Calendar, current: false },
  { name: 'Creators', href: '/creators', icon: Users, current: false },
  { name: 'Insights', href: '/insights', icon: Brain, current: false },
  { name: 'Goals', href: '/goals', icon: Target, current: false },
  { name: 'Upload', href: '/upload', icon: Upload, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "glass-card h-screen transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-pink-500">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="ml-3 text-lg font-semibold gradient-text">
                YouTube Analytics
              </span>
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <a
                href={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                  item.current
                    ? "bg-primary/10 text-primary neon-glow"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    item.current ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground"
                  )}
                  aria-hidden="true"
                />
                {!collapsed && (
                  <span className="ml-3 truncate">{item.name}</span>
                )}
              </a>
            </motion.div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4">
          <div className={cn(
            "flex items-center rounded-lg bg-accent/20 p-3",
            collapsed && "justify-center"
          )}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-pink-500" />
            {!collapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium">Demo User</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}