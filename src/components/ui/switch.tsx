import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[size=default]:h-5 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-9 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-muted data-unchecked:ring-1 data-unchecked:ring-inset data-unchecked:ring-border dark:data-unchecked:bg-input/60 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute select-none font-semibold uppercase tracking-wider text-primary-foreground group-data-[size=default]/switch:text-[8px] group-data-[size=sm]/switch:text-[7px] group-data-[size=default]/switch:left-1.5 group-data-[size=sm]/switch:left-1 group-data-unchecked/switch:opacity-0 group-data-checked/switch:opacity-100 transition-opacity"
      >
        ON
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute select-none font-semibold uppercase tracking-wider text-muted-foreground group-data-[size=default]/switch:text-[8px] group-data-[size=sm]/switch:text-[7px] group-data-[size=default]/switch:right-1.5 group-data-[size=sm]/switch:right-1 group-data-checked/switch:opacity-0 group-data-unchecked/switch:opacity-100 transition-opacity"
      >
        OFF
      </span>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none relative z-10 block rounded-full bg-background shadow-sm ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[1.5rem] group-data-[size=sm]/switch:data-checked:translate-x-[1.25rem] dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0.5 group-data-[size=sm]/switch:data-unchecked:translate-x-0.5 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
