import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
}

interface TooltipProps {
  children: React.ReactNode
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  align?: string
}

const TooltipProvider = ({ children, delayDuration }: TooltipProviderProps) => {
  return <>{children}</>
}

const TooltipContext = React.createContext<{
  isVisible: boolean
  setIsVisible: (visible: boolean) => void
}>({
  isVisible: false,
  setIsVisible: () => {}
})

const Tooltip = ({ children }: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ isVisible, setIsVisible }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = ({ children, asChild }: TooltipTriggerProps) => {
  const { setIsVisible } = React.useContext(TooltipContext)

  return (
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      className="cursor-pointer"
    >
      {children}
    </div>
  )
}

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(({ className, children, side = "top", sideOffset = 4, align, ...props }, ref) => {
  const { isVisible } = React.useContext(TooltipContext)

  if (!isVisible) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        {
          "bottom-full left-1/2 transform -translate-x-1/2 mb-2": side === "top",
          "top-full left-1/2 transform -translate-x-1/2 mt-2": side === "bottom", 
          "right-full top-1/2 transform -translate-y-1/2 mr-2": side === "left",
          "left-full top-1/2 transform -translate-y-1/2 ml-2": side === "right",
        },
        className
      )}
      style={{
        marginTop: side === "bottom" ? sideOffset : undefined,
        marginBottom: side === "top" ? sideOffset : undefined,
        marginLeft: side === "right" ? sideOffset : undefined,
        marginRight: side === "left" ? sideOffset : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
