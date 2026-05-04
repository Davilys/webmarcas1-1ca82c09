// Pixel helpers — Pixel ID 257440690498371 já está carregado em index.html
export const trackLpView = () => {
  try {
    (window as any).fbq?.('track', 'ViewContent', { content_name: 'LP /lp' });
  } catch {}
};

export const trackLpLead = (data?: Record<string, unknown>) => {
  try {
    (window as any).fbq?.('track', 'Lead', { content_name: 'LP form submit', ...data });
  } catch {}
};
