// cn utility using clsx and twMerge for correct Tailwind class overriding
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ClassDictionary = Record<string, any>;
// We still export ClassValue type from clsx if needed
export type { ClassValue };

/**
 * Compose className strings conditionally, resolving Tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;
