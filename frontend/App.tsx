import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsentBanner from './components/CookieConsentBanner';
import { CookieConsentProvider, useCookieConsent, ConsentPreferences } from './contexts/CookieConsentContext';
import Page1Identification from './pages/Page1Identification';
import Page2Etablissements from './pages/Page2Etablissements';
import Page3Antecedents from './pages/Page3Antecedents';
import Page4Garantie from './pages/Page4Garantie';
import Page5Calcul from './pages/Page5Calcul';
import Page6Offre from './pages/Page6Offre';
import FicheContact from './pages/FicheContact';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import DataDeletion from './pages/DataDeletion';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';

export interface AppState {
  siren: string;
  company_data: {
    denomination: string;
    adresse: string;
    code_postal: string;
    ville: string;
    code_naf: string;
    forme_juridique: string;
  };
  etablissements: Array<{
    siret: string;
    nom: string;
    adresse: string;
    code_postal: string;
    ville: string;
    salaries: number;
  }>;
  api_failed: boolean;
  ctn: string;
  broker_code: string | null;
  effectif_global: number;
  antecedents: {
    ip2: number;
    ip3: number;
    ip4: number;
    deces: number;
  };
  choix_garantie: number;
  tarifs: {
    standard_ttc: number;
    premium_ttc: number;
    promo_active: boolean;
    promo_expires?: string;
    promo_label?: string;
    ht?: number;
    taxes?: number;
  };
}

function AppInner() {
  const { updateConsent, revokeConsent, hasConsented } = useCookieConsent();
  const [appState, setAppState] = useState<AppState>({
    siren: '',
    company_data: {
      denomination: '',
      adresse: '',
      code_postal: '',
      ville: '',
      code_naf: '',
      forme_juridique: ''
    },
    etablissements: [],
    api_failed: false,
    ctn: '',
    broker_code: null,
    effectif_global: 0,
    antecedents: {
      ip2: 0,
      ip3: 0,
      ip4: 0,
      deces: 0
    },
    choix_garantie: 0,
    tarifs: {
      standard_ttc: 0,
      premium_ttc: 0,
      promo_active: false,
      promo_expires: '',
      promo_label: '',
      ht: 0,
      taxes: 0,
    }
  });

  const handleAcceptCookies = async (preferences: ConsentPreferences) => {
    await updateConsent(preferences);
  };

  const handleDeclineCookies = () => {
    revokeConsent();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Router>
        <Header />
        <main className="flex-grow pt-20">
          <Routes>
            <Route 
              path="/" 
              element={<Page1Identification appState={appState} setAppState={setAppState} />} 
            />
            <Route 
              path="/page2" 
              element={<Page2Etablissements appState={appState} setAppState={setAppState} />} 
            />
            <Route 
              path="/page3" 
              element={<Page3Antecedents appState={appState} setAppState={setAppState} />} 
            />
            <Route 
              path="/page4" 
              element={<Page4Garantie appState={appState} setAppState={setAppState} />} 
            />
            <Route 
              path="/page5" 
              element={<Page5Calcul appState={appState} setAppState={setAppState} />} 
            />
            <Route 
              path="/page6" 
              element={<Page6Offre appState={appState} setAppState={setAppState} />} 
            />
            <Route 
              path="/contact" 
              element={<FicheContact />} 
            />
            <Route 
              path="/admin" 
              element={<AdminLogin />} 
            />
            <Route 
              path="/admin/dashboard" 
              element={<AdminDashboard />} 
            />
            <Route 
              path="/payment-success" 
              element={<PaymentSuccess />} 
            />
            <Route 
              path="/checkout/success" 
              element={<CheckoutSuccess />} 
            />
            <Route 
              path="/checkout/cancel" 
              element={<CheckoutCancel />} 
            />
            <Route 
              path="/user/delete" 
              element={<DataDeletion />} 
            />
            <Route 
              path="/user/delete/confirm" 
              element={<DataDeletion />} 
            />
          </Routes>
        </main>
        <Footer />
        <Toaster />
        {!hasConsented && (
          <CookieConsentBanner
            onAccept={handleAcceptCookies}
            onDecline={handleDeclineCookies}
          />
        )}
      </Router>
    </div>
  );
}

function App() {
  return (
    <CookieConsentProvider>
      <AppInner />
    </CookieConsentProvider>
  );
}

export default App;
