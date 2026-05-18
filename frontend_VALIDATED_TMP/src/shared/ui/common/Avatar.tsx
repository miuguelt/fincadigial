import React from 'react';
import { cn } from '@/shared/ui/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const AvatarImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ className, ...props }) => {
  return (
    <img
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
};

export const AvatarFallback: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  );
};
