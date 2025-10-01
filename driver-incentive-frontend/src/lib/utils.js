import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export async function fetchJson(input, init) {
  const res = await fetch(input, init);
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
    }
    // Non-JSON but OK response
    throw new Error('Unexpected non-JSON response from server');
  }
  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
  }
  return data;
}
