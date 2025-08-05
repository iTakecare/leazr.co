
import { useTheme } from "@/hooks/useTheme"
import { toast } from "@/hooks/use-toast"
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "@/components/ui/toast"

type ToasterProps = {
  className?: string
}

const Toaster = ({ className, ...props }: ToasterProps) => {
  return (
    <ToastProvider>
      <ToastViewport className={className} {...props} />
    </ToastProvider>
  )
}

export { Toaster }
