import React, { useEffect } from "react";
import { useCookieConsent } from "../contexts/CookieConsentContext";

export function useAnalytics() {
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (!consent?.analytics) {
      return;
    }

    if (typeof window.gtag !== "function") {
      return;
    }
  }, [consent]);

  const trackPageView = (path: string) => {
    if (!consent?.analytics || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("config", "G-XXXXXXXXXX", {
      page_path: path,
    });
  };

  const trackEvent = (eventName: string, params?: Record<string, any>) => {
    if (!consent?.analytics || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", eventName, params);
  };

  return { trackPageView, trackEvent };
}
