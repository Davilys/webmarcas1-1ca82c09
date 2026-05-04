import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
  canonical?: string;
}

/**
 * Lightweight per-page SEO meta updater.
 * Avoids bundling react-helmet-async; sets <title>, meta description and canonical
 * via DOM mutations on mount and restores them on unmount.
 */
export function PageMeta({ title, description, canonical }: PageMetaProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const ensureMeta = (name: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      return el;
    };

    let prevDesc: string | null = null;
    if (description) {
      const desc = ensureMeta("description");
      prevDesc = desc.getAttribute("content");
      desc.setAttribute("content", description);
    }

    let prevCanonical: string | null = null;
    let canonicalEl: HTMLLinkElement | null = null;
    if (canonical) {
      canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement("link");
        canonicalEl.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalEl);
      }
      prevCanonical = canonicalEl.getAttribute("href");
      canonicalEl.setAttribute("href", canonical);
    }

    return () => {
      document.title = prevTitle;
      if (description && prevDesc !== null) {
        document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      }
      if (canonical && canonicalEl && prevCanonical !== null) {
        canonicalEl.setAttribute("href", prevCanonical);
      }
    };
  }, [title, description, canonical]);

  return null;
}
