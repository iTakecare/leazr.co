
import * as React from "react"
import { cn } from "@/lib/utils"

const Timeline = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-8", className)}
    {...props}
  />
))
Timeline.displayName = "Timeline"

const TimelineItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative pl-6", className)}
    {...props}
  />
))
TimelineItem.displayName = "TimelineItem"

const TimelineItemContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("pb-8", className)}
    {...props}
  />
))
TimelineItemContent.displayName = "TimelineItemContent"

const TimelineItemIndicator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean;
  }
>(({ className, active = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-0 top-1 h-3 w-3 rounded-full border border-primary bg-background ring-2 ring-background",
      active && "bg-primary",
      className
    )}
    {...props}
  />
))
TimelineItemIndicator.displayName = "TimelineItemIndicator"

const TimelineItemTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-medium leading-none text-foreground mb-2", className)}
    {...props}
  />
))
TimelineItemTitle.displayName = "TimelineItemTitle"

export {
  Timeline,
  TimelineItem,
  TimelineItemContent,
  TimelineItemIndicator,
  TimelineItemTitle
}
