import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';
import { AppState } from '../App';

interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function Page6Offre({ appState, setAppState }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedOffer, setSelectedOffer] = useState<'standard' | 'premium'>('standard');
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Informations client pour le paiement
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const { siren, tarifs } = appState;

  useEffect(() => {
    if (!hasValidated) return;

    const newErrors: Record<string, string> = {};
    
    if (!customerInfo.name.trim()) {
      newErrors.name = "Votre nom et prénom sont requis.";
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

  const handlePayment = async () => {
    setHasValidated(true);
    
    const newErrors: Record<string, string> = {};
    
    if (!customerInfo.name.trim()) {
      newErrors.name = "Votre nom et prénom sont requis.";
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

    setIsProcessing(true);

    try {
      const isStandard = selectedOffer === 'standard';
      const amount = isStandard ? appState.tarifs.standard_ttc : appState.tarifs.premium_ttc;
      const garantie = isStandard ? appState.choix_garantie : getGarantiePremium();

      // Calcul de la commission courtier
      const commissionPercent = appState.broker_code ? 15 : 0; // 15% de commission par défaut

      const metadata = {
        cgv_accepted: true,
        cgv_version: "2025-01",
        broker_code: appState.broker_code,
        commission: commissionPercent,
        siren: appState.siren,
        garantie: garantie,
        type: selectedOffer,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone
      };

      const response = await backend.atexya.createCheckoutSession({
        amount: Math.round(amount * 100), // Stripe uses cents
        metadata
      });

      // Créer le contrat en base avant la redirection
      try {
        await backend.atexya.createContract({
          siren: appState.siren,
          company_name: appState.company_data.denomination,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          contract_type: selectedOffer,
          garantie_amount: garantie,
          premium_ttc: Math.round(amount * 100), // en centimes
          premium_ht: Math.round((appState.tarifs.ht || 0) * 100),
          taxes: Math.round((appState.tarifs.taxes || 0) * 100),
          broker_code: appState.broker_code || undefined,
          broker_commission_percent: commissionPercent > 0 ? commissionPercent : undefined,
          stripe_session_id: response.session_id,
          cgv_version: "2025-01",
          metadata: {
            ctn: appState.ctn,
            effectif_global: appState.effectif_global,
            antecedents: appState.antecedents,
            etablissements: appState.etablissements
          }
        });
      } catch (contractError) {
        console.error('Erreur création contrat:', contractError);
        // Continuer malgré l'erreur de création de contrat
        // Le webhook pourra créer le contrat plus tard
      }

      // Redirection vers Stripe
      window.location.href = response.checkout_url;

    } catch (error: any) {
      console.error('Erreur création session Stripe:', error);
      
      let errorMessage = "Impossible de créer la session de paiement. Veuillez réessayer.";
      
      // Gestion des erreurs spécifiques
      if (error.message) {
        if (error.message.includes("Configuration")) {
          errorMessage = "Le service de paiement n'est pas encore configuré. Veuillez contacter le support.";
        } else if (error.message.includes("SIREN")) {
          errorMessage = "Erreur avec les données de l'entreprise. Veuillez vérifier votre SIREN.";
        } else if (error.message.includes("email")) {
          errorMessage = "Adresse email invalide. Veuillez corriger et réessayer.";
        }
      }
      
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

  const originalPremiumPrice = appState.tarifs.promo_active 
    ? appState.tarifs.premium_ttc / (1 - 15 / 100)
    : appState.tarifs.premium_ttc;

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
        case 'name':
          isValid = customerInfo.name.trim() !== '';
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
          Voici le récapitulatif de votre devis d'assurance responsabilité civile professionnelle.
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
                  <Label htmlFor="customer-name" className={`font-bold text-[#0f2f47] ${getLabelClasses('name')}`}>
                    Nom et prénom *
                  </Label>
                  <Input
                    id="customer-name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    onFocus={() => handleFieldFocus('name')}
                    onBlur={() => handleFieldBlur('name')}
                    placeholder="Votre nom et prénom"
                    className={getFieldClasses('name')}
                    required
                    aria-invalid={hasValidated && errors.name ? "true" : "false"}
                    aria-describedby={hasValidated && errors.name ? "name-error" : undefined}
                  />
                  {hasValidated && errors.name && (
                    <p id="name-error" className="error-text">{errors.name}</p>
                  )}
                </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className={`cursor-pointer transition-all duration-200 ${
                selectedOffer === 'standard' 
                  ? 'border-2 border-[#0f2f47] bg-blue-50' 
                  : 'border-gray-200 hover:border-[#0f2f47]'
              }`}
              onClick={() => setSelectedOffer('standard')}
            >
              <CardHeader>
                <CardTitle className="text-center font-astaneh text-[#0f2f47]">
                  Offre Standard
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div>
                  <div className="text-3xl font-bold font-astaneh text-[#0f2f47]">
                    {formatCurrency(appState.choix_garantie)}
                  </div>
                  <div className="text-sm text-gray-600">de garantie ({getTypeGarantie()})</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#c19a5f]">
                    {formatCurrency(appState.tarifs.standard_ttc)}
                    <span className="text-sm font-normal text-gray-600"> TTC/an</span>
                  </div>
                  <div className="text-base text-gray-700 mt-1">
                    ou {formatCurrency((appState.tarifs.standard_ttc * 1.2) / 12)}
                    <span className="text-sm font-normal"> TTC/mois</span>
                  </div>
                </div>
                {appState.broker_code && (
                  <div className="text-xs text-gray-500">
                    Commission courtier incluse
                  </div>
                )}
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all duration-200 ${
                selectedOffer === 'premium' 
                  ? 'border-2 border-[#c19a5f] bg-yellow-50' 
                  : 'border-gray-200 hover:border-[#c19a5f]'
              }`}
              onClick={() => setSelectedOffer('premium')}
            >
              <CardHeader>
                <CardTitle className="text-center text-[#c19a5f] flex items-center justify-center gap-2 font-astaneh">
                  Offre Premium
                  {appState.tarifs.promo_active && (
                    <Badge variant="destructive" className="text-xs">PROMO</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div>
                  <div className="text-3xl font-bold text-[#c19a5f] font-astaneh">
                    {formatCurrency(getGarantiePremium())}
                  </div>
                  <div className="text-sm text-gray-600">de garantie ({getTypeGarantie()})</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Garantie majorée de 20%
                  </div>
                </div>
                <div>
                  {appState.tarifs.promo_active && (
                    <div className="text-lg line-through text-gray-400">
                      {formatCurrency(originalPremiumPrice)}
                    </div>
                  )}
                  <div className="text-2xl font-bold text-[#c19a5f]">
                    {formatCurrency(appState.tarifs.premium_ttc)}
                    <span className="text-sm font-normal text-gray-600"> TTC/an</span>
                  </div>
                  <div className="text-base text-gray-700 mt-1">
                    ou {formatCurrency((appState.tarifs.premium_ttc * 1.2) / 12)}
                    <span className="text-sm font-normal"> TTC/mois</span>
                  </div>
                  {appState.tarifs.promo_active && (
                    <div className="text-sm text-red-600 font-medium mt-2">
                      Offre promotionnelle valable jusqu'au {appState.tarifs.promo_expires}
                    </div>
                  )}
                </div>
                {appState.broker_code && (
                  <div className="text-xs text-gray-500">
                    Commission courtier incluse
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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

          <div className="flex justify-end pt-4">
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Traitement...' : 'Valider et passer au paiement'}
            </Button>
          </div>
          <div className="mt-2 text-sm text-gray-500 text-right">
            Paiement sécurisé par Stripe • Facturation automatique
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
