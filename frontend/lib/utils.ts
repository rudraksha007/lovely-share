import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function makeUUID() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // Set version (4) in byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x40;

  // Set variant in byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");

  return (
    hex.slice(0, 8) + "-" +
    hex.slice(8, 12) + "-" +
    hex.slice(12, 16) + "-" +
    hex.slice(16, 20) + "-" +
    hex.slice(20)
  );
}