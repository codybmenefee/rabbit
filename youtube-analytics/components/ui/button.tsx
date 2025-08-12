import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-signal-green-500/50 disabled:pointer-events-none disabled:opacity-50 terminal-text uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "terminal-surface border-signal-green-600/50 text-signal-green-400 hover:text-signal-green-300 hover:border-signal-green-500/70 hover:shadow-lg hover:shadow-signal-green-500/20",
        destructive:
          "terminal-surface border-signal-red-600/50 text-signal-red-400 hover:text-signal-red-300 hover:border-signal-red-500/70 hover:shadow-lg hover:shadow-signal-red-500/20",
        outline:
          "border border-terminal-border bg-terminal-surface/50 backdrop-blur-xl text-terminal-text hover:border-terminal-border hover:bg-terminal-surface hover:text-terminal-text",
        secondary:
          "bg-terminal-surface/50 text-terminal-muted hover:bg-terminal-surface hover:text-terminal-text",
        ghost: "text-terminal-muted hover:bg-terminal-surface/30 hover:text-terminal-text",
        link: "text-signal-orange-400 underline-offset-4 hover:underline hover:text-signal-orange-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }