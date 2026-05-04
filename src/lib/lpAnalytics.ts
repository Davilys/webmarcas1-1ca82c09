// Pixel helpers — Pixel ID 257440690498371 já está carregado em index.html
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const trackLpView = () => {
  try {
    window.fbq?.('track', 'ViewContent', { content_name: 'LP /lp' });
  } catch {}
};

export const trackLpLead = (data?: Record<string, any>) => {
  try {
    window.fbq?.('track', 'Lead', { content_name: 'LP form submit', ...data });
  } catch {}
};
