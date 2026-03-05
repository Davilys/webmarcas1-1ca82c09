import { useEffect } from 'react';

const UTM_STORAGE_KEY = 'webmarcas_utm_params';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  captured_at?: string;
}

export function captureUTMParams(): UTMParams | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {};
  let hasAny = false;

  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const;
  for (const key of keys) {
    const val = params.get(key);
    if (val) {
      utm[key] = val;
      hasAny = true;
    }
  }

  if (hasAny) {
    utm.captured_at = new Date().toISOString();
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    return utm;
  }
  return null;
}

export function getStoredUTMParams(): UTMParams | null {
  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function clearStoredUTMParams(): void {
  localStorage.removeItem(UTM_STORAGE_KEY);
}

export function useUTMCapture() {
  useEffect(() => {
    captureUTMParams();
  }, []);

  return { getStoredUTMParams, clearStoredUTMParams };
}
