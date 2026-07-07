import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import {
  fieldFocusClassName,
  fieldFrameClassName,
  fieldInvalidClassName,
} from "@/components/ui/field-focus"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 px-3 py-1 text-base transition-[color,box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        fieldFrameClassName,
        fieldFocusClassName,
        fieldInvalidClassName,
        className
      )}
      {...props}
    />
  )
}

export { Input }
