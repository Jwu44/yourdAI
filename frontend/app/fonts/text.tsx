import React from 'react';
import { cn } from "@/lib/utils"

interface TypographyProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function TypographyH1({ children, className, ...props }: TypographyProps) {
  return (
    <h1 
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

// Similarly for other heading levels:
export function TypographyH2({ children, className, ...props }: TypographyProps) {
  return (
    <h2 
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function TypographyH3({ children, className, ...props }: TypographyProps) {
    return (
        <h3 
        className={cn(
            "scroll-m-20 text-2xl font-semibold tracking-tight text-white",
            className
        )}
        {...props}
        >
        {children}
        </h3>
    )
}

export function TypographyH4({ children, className, ...props }: TypographyProps) {
  return (
    <h4 
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight text-white",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
}

export function TypographyP({ children, className, ...props }: TypographyProps) {
    return (
        <p 
        className={cn(
            "leading-7 [&:not(:first-child)]:mt-6 text-gray-200",
            className
        )}
        {...props}
        >
        {children}
        </p>
    )
}