import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';
import { AppState } from '../App';
import PaymentOptions from '../components/PaymentOptions';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import { computePricing } from '@/lib/pricing';

interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function Page6Offre({ appState, setAppState }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // États pour la confirmation de paiement
  const [selectedPaymentType, setSelectedPaymentType] = useState<'annual' | 'monthly'>('annual');
  const [selectedProductType, setSelectedProductType] = useState<'standard' | 'premium'>('standard');
  
  // Informations client pour le contrat
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const idempotencyKeyRef = useRef<string | null>(null);

  const { siren, tarifs } = appState;

  useEffect(() => {
    if (!hasValidated) return;

    const newErrors: Record<string, string> = {};
    
    if (!customerInfo.firstName.trim() || customerInfo.firstName.trim().length < 2) {
      newErrors.firstName = "Le prénom doit contenir au moins 2 caractères.";
    }

    if (!customerInfo.lastName.trim() || customerInfo.lastName.trim().length < 2) {
      newErrors.lastName = "Le nom doit contenir au moins 2 caractères.";
    }

    if (!customerInfo.email.trim()) {
      newErrors.email = "Votre adresse email est requise.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerInfo.email)) {
        newErrors.email = "Veuillez saisir une adresse email valide.";
      }
    }

    if (!cgvAccepted) {
      newErrors.cgv = "Vous devez accepter les conditions générales.";
    }

    setErrors(newErrors);
  }, [customerInfo, cgvAccepted, hasValidated]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getGarantiePremium = () => {
    // Nouvelles règles : +20% au lieu de +50%
    return appState.choix_garantie * 1.20;
  };

  const handlePaymentSelect = (paymentType: 'annual' | 'monthly', productType: 'standard' | 'premium') => {
    setHasValidated(true);
    
    const newErrors: Record<string, string> = {};
    
    if (!customerInfo.firstName.trim() || customerInfo.firstName.trim().length < 2) {
      newErrors.firstName = "Le prénom doit contenir au moins 2 caractères.";
    }

    if (!customerInfo.lastName.trim() || customerInfo.lastName.trim().length < 2) {
      newErrors.lastName = "Le nom doit contenir au moins 2 caractères.";
    }

    if (!customerInfo.email.trim()) {
      newErrors.email = "Votre adresse email est requise.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerInfo.email)) {
        newErrors.email = "Veuillez saisir une adresse email valide.";
      }
    }

    if (!cgvAccepted) {
      newErrors.cgv = "Vous devez accepter les conditions générales.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez corriger les erreurs pour continuer.",
        variant: "destructive"
      });
      return;
    }

    setSelectedPaymentType(paymentType);
    setSelectedProductType(productType);
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);

    try {
      const effectifNum = Number(appState.effectif_global);
      if (!Number.isInteger(effectifNum) || effectifNum <= 0) {
        throw new Error('Invalid effectif_global: must be a positive integer');
      }

      const pricingCalc = computePricing({
        plan: selectedProductType,
        billingCycle: selectedPaymentType,
        headcount: effectifNum,
        pricing: {
          standard_ttc: appState.tarifs.standard_ttc,
          premium_ttc: appState.tarifs.premium_ttc
        }
      });

      const isStandard = selectedProductType === 'standard';
      const garantie = isStandard ? appState.choix_garantie : getGarantiePremium();

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `${appState.siren}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      const idempotencyKey = idempotencyKeyRef.current;

      const customerName = `${customerInfo.firstName.trim()} ${customerInfo.lastName.trim()}`;

      const contractResponse = await backend.atexya.createContract({
        siren: appState.siren,
        company_name: appState.company_data.denomination,
        customer_email: customerInfo.email.trim(),
        customer_name: customerName,
        customer_phone: customerInfo.phone.trim() || undefined,
        contract_type: selectedProductType,
        garantie_amount: garantie,
        premium_ttc: pricingCalc.priceEUR,
        premium_ht: appState.tarifs.ht || 0,
        taxes: appState.tarifs.taxes || 0,
        payment_type: selectedPaymentType,
        broker_code: appState.broker_code || undefined,
        broker_commission_percent: appState.broker_code ? 15 : undefined,
        cgv_version: "2025-01",
        metadata: {
          ctn: appState.ctn,
          effectif_global: effectifNum,
          antecedents: appState.antecedents,
          etablissements: appState.etablissements
        },
        idempotency_key: `contract_${idempotencyKey}`,
        headcount: effectifNum,
        amount_cents: pricingCalc.amount_cents,
        currency: 'EUR'
      });

      const quoteData = {
        companyName: appState.company_data.denomination,
        sirenNumber: appState.siren,
        effectif: effectifNum,
        secteurCTN: appState.ctn,
        garantieAmount: garantie,
        priceStandard: appState.tarifs.standard_ttc,
        pricePremium: appState.tarifs.premium_ttc,
        hasAntecedents: appState.antecedents.ip2 > 0 || appState.antecedents.ip3 > 0 || appState.antecedents.ip4 > 0 || appState.antecedents.deces > 0,
        customerEmail: customerInfo.email.trim(),
        customerName: customerName,
        customerPhone: customerInfo.phone.trim() || undefined,
        brokerCode: appState.broker_code || undefined
      };

      const paymentOption = {
        type: selectedPaymentType,
        productType: selectedProductType
      };

      const stripeResponse = await backend.stripe.createPaymentSession({
        quoteData,
        paymentOption,
        cgvVersion: "2025-01",
        contractId: contractResponse.contract_id,
        idempotencyKey: `stripe_${idempotencyKey}`,
        headcount: effectifNum,
        amount_cents: pricingCalc.amount_cents
      });

      // Mettre à jour le contrat avec les infos Stripe
      await backend.atexya.updateContractStatus({
        contract_id: contractResponse.contract_id,
        payment_status: 'pending',
        stripe_session_id: stripeResponse.sessionId,
        stripe_customer_id: stripeResponse.customerId
      });

      // Rediriger vers Stripe Checkout
      window.location.href = stripeResponse.sessionUrl;

    } catch (error: any) {
      console.error('Erreur création session paiement:', error);
      
      const errorMessage = error?.message || error?.error?.message || "Impossible d'initialiser le paiement. Veuillez réessayer ou contacter le support.";
      
      toast({
        title: "Erreur de paiement",
        description: errorMessage,
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const getTypeGarantie = () => {
    return appState.effectif_global <= 60 ? 'IP3 & IP4' : 'IP4 seul';
  };

  const getFieldClasses = (field: string) => {
    const hasError = hasValidated && errors[field];
    const isActive = activeField === field;
    const baseClasses = "";
    
    if (hasError && isActive) {
      return `${baseClasses} is-error is-active`;
    } else if (hasError) {
      return `${baseClasses} is-error`;
    }
    return baseClasses;
  };

  const getLabelClasses = (field: string) => {
    const hasError = hasValidated && errors[field];
    return hasError ? "is-error" : "";
  };

  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
  };

  const handleFieldBlur = (fieldName: string) => {
    setActiveField(null);
    
    if (hasValidated && errors[fieldName]) {
      const newErrors = { ...errors };
      
      let isValid = false;
      switch (fieldName) {
        case 'firstName':
          isValid = customerInfo.firstName.trim() !== '' && customerInfo.firstName.trim().length >= 2;
          break;
        case 'lastName':
          isValid = customerInfo.lastName.trim() !== '' && customerInfo.lastName.trim().length >= 2;
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          isValid = customerInfo.email.trim() !== '' && emailRegex.test(customerInfo.email);
          break;
        case 'cgv':
          isValid = cgvAccepted;
          break;
      }
      
      if (isValid) {
        delete newErrors[fieldName];
        setErrors(newErrors);
      }
    }
  };

  if (!siren || !tarifs.standard_ttc) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-astaneh text-[#0f2f47]">
            Données de l'offre non disponibles
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Veuillez compléter le parcours de souscription depuis le début pour générer une offre.
          </p>
        </div>
        <Card className="w-full max-w-3xl bg-white shadow-lg rounded-lg">
          <CardContent className="p-8 text-center">
            <Button onClick={() => navigate('/')} className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-astaneh text-[#0f2f47]">
          Votre Offre Finale
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Finalisez votre souscription et procédez au paiement sécurisé.
        </p>
      </div>

      <Card className="w-full max-w-4xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 space-y-6">
          <Card className="border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 font-bold font-astaneh">
                Récapitulatif de l'entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div><strong>Raison Sociale :</strong> {appState.company_data.denomination}</div>
              <div><strong>SIREN :</strong> {appState.siren}</div>
              <div className="col-span-2"><strong>Adresse :</strong> {`${appState.company_data.adresse}, ${appState.company_data.code_postal} ${appState.company_data.ville}`}</div>
              <div><strong>Code NAF :</strong> {appState.company_data.code_naf}</div>
              <div><strong>CTN :</strong> {appState.ctn}</div>
              {appState.broker_code && (
                <div><strong>Code Courtier :</strong> {appState.broker_code}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-bold text-[#0f2f47] font-astaneh">
                1. Établissements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {appState.etablissements.map((etab, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium">{etab.nom}</div>
                      <div className="text-sm text-gray-600">SIRET: {etab.siret}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{etab.salaries} salarié{etab.salaries !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t-2 border-gray-300">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Effectif global</span>
                    <span>{appState.effectif_global} salarié{appState.effectif_global !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-bold text-[#0f2f47] font-astaneh">
                2. Antécédents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#c19a5f]">{appState.antecedents.ip2}</div>
                  <div className="text-sm text-gray-600">IP2</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#c19a5f]">{appState.antecedents.ip3}</div>
                  <div className="text-sm text-gray-600">IP3</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#c19a5f]">{appState.antecedents.ip4}</div>
                  <div className="text-sm text-gray-600">IP4</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#c19a5f]">{appState.antecedents.deces}</div>
                  <div className="text-sm text-gray-600">Décès</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 font-bold font-astaneh">
                3. Vos coordonnées pour la souscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customer-firstName" className={`font-bold text-[#0f2f47] ${getLabelClasses('firstName')}`}>
                    Prénom *
                  </Label>
                  <Input
                    id="customer-firstName"
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    onFocus={() => handleFieldFocus('firstName')}
                    onBlur={() => handleFieldBlur('firstName')}
                    placeholder="Votre prénom"
                    className={getFieldClasses('firstName')}
                    required
                    aria-invalid={hasValidated && errors.firstName ? "true" : "false"}
                    aria-describedby={hasValidated && errors.firstName ? "firstName-error" : undefined}
                  />
                  {hasValidated && errors.firstName && (
                    <p id="firstName-error" className="error-text">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-lastName" className={`font-bold text-[#0f2f47] ${getLabelClasses('lastName')}`}>
                    Nom *
                  </Label>
                  <Input
                    id="customer-lastName"
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                    onFocus={() => handleFieldFocus('lastName')}
                    onBlur={() => handleFieldBlur('lastName')}
                    placeholder="Votre nom"
                    className={getFieldClasses('lastName')}
                    required
                    aria-invalid={hasValidated && errors.lastName ? "true" : "false"}
                    aria-describedby={hasValidated && errors.lastName ? "lastName-error" : undefined}
                  />
                  {hasValidated && errors.lastName && (
                    <p id="lastName-error" className="error-text">{errors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customer-email" className={`font-bold text-[#0f2f47] ${getLabelClasses('email')}`}>
                    Email *
                  </Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    onFocus={() => handleFieldFocus('email')}
                    onBlur={() => handleFieldBlur('email')}
                    placeholder="votre.email@exemple.com"
                    className={getFieldClasses('email')}
                    required
                    aria-invalid={hasValidated && errors.email ? "true" : "false"}
                    aria-describedby={hasValidated && errors.email ? "email-error" : undefined}
                  />
                  {hasValidated && errors.email && (
                    <p id="email-error" className="error-text">{errors.email}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone" className="font-bold text-[#0f2f47]">Téléphone</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01 23 45 67 89"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-bold text-[#0f2f47] font-astaneh">
                4. Choix de votre offre et paiement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentOptions
                standardPrice={appState.tarifs.standard_ttc}
                premiumPrice={appState.tarifs.premium_ttc}
                promoActive={appState.tarifs.promo_active}
                promoLabel={appState.tarifs.promo_label}
                onPaymentSelect={handlePaymentSelect}
                isProcessing={isProcessing}
                headcount={Number(appState.effectif_global)}
              />
            </CardContent>
          </Card>

          <div className={`flex items-center space-x-3 ${hasValidated && errors.cgv ? 'p-2 rounded bg-yellow-50' : ''}`}>
            <Checkbox
              id="cgv"
              checked={cgvAccepted}
              onCheckedChange={(checked) => {
                setCgvAccepted(Boolean(checked));
                if (hasValidated && Boolean(checked)) {
                  const newErrors = { ...errors };
                  delete newErrors.cgv;
                  setErrors(newErrors);
                }
              }}
              aria-invalid={hasValidated && errors.cgv ? "true" : "false"}
              aria-describedby={hasValidated && errors.cgv ? "cgv-error" : undefined}
            />
            <Label 
              htmlFor="cgv" 
              className={`text-sm cursor-pointer ${getLabelClasses('cgv')}`}
            >
              J'ai lu et accepté les{' '}
              <a 
                href="/docs/cgv.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#c19a5f] hover:underline"
              >
                conditions générales
              </a>
              {' '}<span className="text-red-500">*</span>
            </Label>
          </div>
          {hasValidated && errors.cgv && (
            <p id="cgv-error" className="error-text -mt-2 ml-2">{errors.cgv}</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmation */}
      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPayment}
        paymentType={selectedPaymentType}
        productType={selectedProductType}
        amount={computePricing({
          plan: selectedProductType,
          billingCycle: selectedPaymentType,
          headcount: Number(appState.effectif_global),
          pricing: { standard_ttc: appState.tarifs.standard_ttc, premium_ttc: appState.tarifs.premium_ttc }
        }).priceEUR}
        companyName={appState.company_data.denomination}
        garantieAmount={appState.choix_garantie}
      />
    </div>
  );
}
