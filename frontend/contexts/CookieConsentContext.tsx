import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import backend from "~backend/client";

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentContextType {
  consent: ConsentPreferences | null;
  hasConsented: boolean;
  updateConsent: (preferences: ConsentPreferences) => Promise<void>;
  revokeConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem("cookie_consent");
    if (storedConsent) {
      try {
        const parsed = JSON.parse(storedConsent);
        setConsent(parsed);
        setHasConsented(true);

        if (parsed.analytics) {
          loadGoogleAnalytics();
        }
      } catch (error) {
        console.error("Error parsing stored consent:", error);
      }
    }
  }, []);

  const updateConsent = async (preferences: ConsentPreferences) => {
    setConsent(preferences);
    setHasConsented(true);

    localStorage.setItem("cookie_consent", JSON.stringify(preferences));
    localStorage.setItem("cookie_consent_date", new Date().toISOString());

    if (preferences.analytics) {
      loadGoogleAnalytics();
    } else {
      removeGoogleAnalytics();
    }

    try {
      await backend.user.saveConsentPreferences({
        analytics: preferences.analytics,
        marketing: preferences.marketing,
      });
    } catch (error) {
      console.error("Error saving consent to backend:", error);
    }
  };

  const revokeConsent = () => {
    const revokedPreferences: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };

    setConsent(revokedPreferences);
    setHasConsented(true);

    localStorage.setItem("cookie_consent", JSON.stringify(revokedPreferences));
    localStorage.setItem("cookie_consent_date", new Date().toISOString());

    removeGoogleAnalytics();

    try {
      backend.user.saveConsentPreferences({
        analytics: false,
        marketing: false,
      });
    } catch (error) {
      console.error("Error revoking consent in backend:", error);
    }
  };

  return (
    <CookieConsentContext.Provider value={{ consent, hasConsented, updateConsent, revokeConsent }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return context;
}

function loadGoogleAnalytics() {
  const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

  if (typeof window === "undefined") return;

  if (document.getElementById("google-analytics-script")) {
    return;
  }

  const script1 = document.createElement("script");
  script1.id = "google-analytics-script";
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  const script2 = document.createElement("script");
  script2.id = "google-analytics-config";
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });
  `;
  document.head.appendChild(script2);

  console.log("Google Analytics loaded");
}

function removeGoogleAnalytics() {
  if (typeof window === "undefined") return;

  const script1 = document.getElementById("google-analytics-script");
  const script2 = document.getElementById("google-analytics-config");

  if (script1) script1.remove();
  if (script2) script2.remove();

  if (window.dataLayer) {
    window.dataLayer = [];
  }

  document.cookie.split(";").forEach((cookie) => {
    const cookieName = cookie.split("=")[0].trim();
    if (cookieName.startsWith("_ga") || cookieName.startsWith("_gid")) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });

  console.log("Google Analytics removed");
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
