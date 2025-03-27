
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InputWithCounterProps extends React.InputHTMLAttributes<HTMLInputElement> {
  maxLength?: number;
}

export const InputWithCounter = React.forwardRef<HTMLInputElement, InputWithCounterProps>(
  ({ className, maxLength = 255, value, onChange, ...props }, ref) => {
    const currentLength = typeof value === 'string' ? value.length : 0;
    
    return (
      <div className="relative">
        <Input 
          ref={ref} 
          className={cn(className)} 
          value={value} 
          onChange={onChange} 
          maxLength={maxLength} 
          {...props} 
        />
        <div className="absolute right-2 bottom-1 text-xs text-muted-foreground">
          {currentLength}/{maxLength}
        </div>
      </div>
    );
  }
);

InputWithCounter.displayName = "InputWithCounter";
