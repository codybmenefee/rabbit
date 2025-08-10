import * as React from "react"
import { cn } from "@/lib/utils"

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, title, subtitle, actions, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl bg-black/20 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-xl shadow-black/20 hover:border-white/[0.12] transition-all duration-200",
          className
        )}
        {...props}
      >
        {(title || subtitle || actions) && (
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-1">
              {title && (
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-400">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        )}
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    )
  }
)

ChartContainer.displayName = "ChartContainer"

// Chart theme configuration for consistent styling across all charts
export const chartTheme = {
  colors: {
    primary: '#8b5cf6',
    secondary: '#ec4899', 
    tertiary: '#06b6d4',
    quaternary: '#10b981',
    surface: 'rgba(255, 255, 255, 0.02)',
    border: 'rgba(255, 255, 255, 0.08)',
    text: {
      primary: '#ffffff',
      secondary: '#d1d5db',
      muted: '#9ca3af'
    },
    grid: 'rgba(255, 255, 255, 0.05)'
  },
  borderRadius: 8,
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16
  }
}