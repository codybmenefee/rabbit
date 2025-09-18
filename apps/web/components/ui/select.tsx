import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, onValueChange, options, placeholder = "Select...", className, disabled = false }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [focusedIndex, setFocusedIndex] = React.useState(-1)
    const selectedOption = options.find(option => option.value === value)

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (isOpen && focusedIndex >= 0) {
            onValueChange(options[focusedIndex].value)
            setIsOpen(false)
            setFocusedIndex(-1)
          } else {
            setIsOpen(!isOpen)
          }
          break
        case 'Escape':
          setIsOpen(false)
          setFocusedIndex(-1)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
            setFocusedIndex(0)
          } else {
            setFocusedIndex(prev => Math.min(prev + 1, options.length - 1))
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (isOpen) {
            setFocusedIndex(prev => Math.max(prev - 1, 0))
          }
          break
      }
    }

    React.useEffect(() => {
      if (isOpen && selectedOption) {
        const index = options.findIndex(option => option.value === value)
        setFocusedIndex(index)
      }
    }, [isOpen, options, selectedOption, value])

    return (
      <div className="relative">
        <button
          ref={ref}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-lg bg-glass-subtle backdrop-blur-glass border border-glass-border px-4 py-2 text-sm text-gray-300",
            "hover:bg-glass-subtle-hover hover:border-glass-border-hover focus:outline-none focus:ring-2 focus:ring-purple-500/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200 flex-shrink-0 ml-2",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 rounded-lg bg-black/90 backdrop-blur-2xl border border-white/[0.12] shadow-xl shadow-black/50 overflow-hidden">
            <div className="max-h-60 overflow-auto py-1" role="listbox">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value)
                    setIsOpen(false)
                    setFocusedIndex(-1)
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm transition-colors",
                    "hover:bg-white/[0.06] focus:outline-none focus:bg-white/[0.08]",
                    value === option.value
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-gray-300",
                    index === focusedIndex && "bg-white/[0.08]"
                  )}
                  role="option"
                  aria-selected={value === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)

Select.displayName = "Select"