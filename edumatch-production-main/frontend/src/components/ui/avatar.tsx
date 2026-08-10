import * as React from "react"
import Image from "next/image"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

interface AvatarImageProps extends Omit<React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>, 'asChild'> {
  useNextImage?: boolean;
  priority?: boolean;
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, alt, useNextImage = true, priority = false, ...props }, ref) => {
  // Use Next.js Image for better optimization if enabled
  if (useNextImage && src) {
    return (
      <AvatarPrimitive.Image
        ref={ref}
        className={cn("aspect-square h-full w-full", className)}
        asChild
        {...props}
      >
        <Image
          src={src}
          alt={alt || 'Avatar'}
          fill
          sizes="(max-width: 768px) 40px, 80px"
          className="object-cover"
          loading={priority ? undefined : "lazy"}
          priority={priority}
        />
      </AvatarPrimitive.Image>
    );
  }

  // Fallback to regular img for non-optimized images
  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
