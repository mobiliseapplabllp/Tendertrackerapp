import { useState, useEffect } from 'react';

interface Branding {
  appName: string;
  tagline: string;
}

const DEFAULT_BRANDING: Branding = {
  appName: 'Mobilise CRM',
  tagline: 'Intelligent Lead Management Platform',
};

let cachedBranding: Branding | null = null;

export function useBranding() {
  const [branding, setBranding] = useState<Branding>(cachedBranding || DEFAULT_BRANDING);
  const [loading, setLoading] = useState(!cachedBranding);

  useEffect(() => {
    if (cachedBranding) return;

    const fetchBranding = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const res = await fetch(`${baseUrl}/branding`);
        const json = await res.json();
        if (json.success && json.data) {
          const b = { appName: json.data.appName, tagline: json.data.tagline };
          cachedBranding = b;
          setBranding(b);
          document.title = b.appName;
        }
      } catch {
        // Use defaults silently
      } finally {
        setLoading(false);
      }
    };
    fetchBranding();
  }, []);

  return { ...branding, loading };
}
