import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProxiedUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  // Avoid double proxying
  if (url.includes('images.weserv.nl')) return url;
  // Use images.weserv.nl as a CORS proxy for images
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=png`;
}
