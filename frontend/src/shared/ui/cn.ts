import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ClassDictionary = Record<string, any>;
export type { ClassValue };

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;
