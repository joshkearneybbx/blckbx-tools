import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cta))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
  " hover-elevate button-press",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--cta))] text-[hsl(var(--cta-foreground))] border border-[hsl(var(--primary-border))] shadow-sm hover:shadow-md",
        destructive:
          "bg-[hsl(var(--error))] text-[hsl(var(--error-foreground))] border border-[hsl(var(--destructive-border))] shadow-sm hover:shadow-md",
        outline:
          "border border-[hsl(var(--button-outline))] bg-transparent shadow-sm hover:shadow-md",
        secondary:
          "bg-[hsl(var(--sand-200))] text-[hsl(var(--foreground))] border border-[hsl(var(--secondary-border))] shadow-sm hover:shadow-md",
        ghost: "border border-transparent shadow-none hover:shadow-sm hover:bg-[hsl(var(--sand-100))]",
        link: "border-transparent text-[hsl(var(--foreground))] underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
