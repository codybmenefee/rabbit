import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-purple-500/20 text-purple-300 border border-purple-500/30",
        secondary:
          "bg-white/[0.08] text-gray-300 border border-white/[0.12]",
        success:
          "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
        warning:
          "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
        destructive:
          "bg-red-500/20 text-red-300 border border-red-500/30",
        outline:
          "bg-transparent text-gray-400 border border-white/[0.08] hover:bg-white/[0.04] hover:text-gray-300",
        ghost:
          "bg-transparent text-gray-400 hover:bg-white/[0.04] hover:text-gray-300",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }