import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Calculator, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppState } from '../App';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';
import { computePricing } from '@/lib/pricing';

interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function Page5Calcul({ appState, setAppState }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isCalculating, setIsCalculating] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [tempData, setTempData] = useState<Partial<AppState>>({});
  const [hasValidated, setHasValidated] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Vérification établissements', key: 'effectif_global' },
    { label: 'Analyse antécédents', key: 'antecedents' },
    { label: 'Calcul tarif', key: 'calcul' }
  ];

  useEffect(() => {
    const checkData = () => {
      const missing: string[] = [];
      if (!appState.siren) missing.push('siren');
      if (!appState.effectif_global || appState.effectif_global < 20 || appState.effectif_global > 100) missing.push('effectif_global');
      if (!appState.ctn || appState.ctn === 'B') missing.push('ctn');
      if (!appState.choix_garantie) missing.push('choix_garantie');
      
      setMissingFields(missing);
      if (missing.length === 0) {
        setIsCalculating(true);
      }
    };
    checkData();
  }, [appState]);

  useEffect(() => {
    if (!isCalculating) return;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          calculerTarifs();
          return 100;
        }
        const newStep = Math.floor((prev + 2) / (100 / steps.length));
        if (newStep !== currentStep) setCurrentStep(newStep);
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isCalculating, currentStep, steps.length]);

  useEffect(() => {
    if (!hasValidated) return;

    const newErrors: Record<string, string> = {};
    
    if (missingFields.includes('siren') && !tempData.siren) {
      newErrors.siren = "Le numéro SIREN est requis.";
    } else if (tempData.siren && !/^\d{9}$/.test(tempData.siren)) {
      newErrors.siren = "Le SIREN doit contenir 9 chiffres.";
    }

    const effectifNum = Number(tempData.effectif_global);
    if (missingFields.includes('effectif_global') && (!effectifNum || effectifNum < 20 || effectifNum > 100 || !Number.isInteger(effectifNum))) {
      newErrors.effectif_global = "L'effectif doit être un nombre entier entre 20 et 100.";
    }

    if (missingFields.includes('ctn') && (!tempData.ctn || tempData.ctn === 'B')) {
      newErrors.ctn = "Veuillez sélectionner un CTN valide (pas B).";
    }

    if (missingFields.includes('choix_garantie') && !tempData.choix_garantie) {
      newErrors.choix_garantie = "Veuillez sélectionner un montant de garantie.";
    }

    setErrors(newErrors);
  }, [tempData, missingFields, hasValidated]);

  const handleTempDataChange = (field: keyof AppState, value: any) => {
    setTempData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompleteAndContinue = () => {
    setHasValidated(true);
    
    const newErrors: Record<string, string> = {};
    
    if (missingFields.includes('siren') && !tempData.siren) {
      newErrors.siren = "Le numéro SIREN est requis.";
    } else if (tempData.siren && !/^\d{9}$/.test(tempData.siren)) {
      newErrors.siren = "Le SIREN doit contenir 9 chiffres.";
    }

    const effectifNum = Number(tempData.effectif_global);
    if (missingFields.includes('effectif_global') && (!effectifNum || effectifNum < 20 || effectifNum > 100 || !Number.isInteger(effectifNum))) {
      newErrors.effectif_global = "L'effectif doit être un nombre entier entre 20 et 100.";
    }

    if (missingFields.includes('ctn') && (!tempData.ctn || tempData.ctn === 'B')) {
      newErrors.ctn = "Veuillez sélectionner un CTN valide (pas B).";
    }

    if (missingFields.includes('choix_garantie') && !tempData.choix_garantie) {
      newErrors.choix_garantie = "Veuillez sélectionner un montant de garantie.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Données manquantes",
        description: "Veuillez corriger les erreurs pour continuer.",
        variant: "destructive"
      });
      return;
    }

    setAppState({ ...appState, ...tempData });
    toast({ title: "Données complétées", description: "Calcul de votre offre en cours..." });
  };

  const calculerTarifs = async () => {
    try {
      const effectifNum = Number(appState.effectif_global);
      if (!Number.isInteger(effectifNum) || effectifNum <= 0) {
        throw new Error('Invalid effectif_global');
      }
      
      const response = await backend.atexya.calculatePricing({
        effectif_global: effectifNum,
        ctn: appState.ctn,
        antecedents: appState.antecedents,
        choix_garantie: appState.choix_garantie,
        broker_code: appState.broker_code || undefined
      });

      setAppState({ 
        ...appState, 
        tarifs: {
          standard_ttc: response.standard_ttc,
          premium_ttc: response.premium_ttc,
          promo_active: response.promo_active,
          promo_expires: response.promo_expires,
          promo_label: response.promo_label,
          ht: response.ht,
          taxes: response.taxes
        }
      });
      
      setTimeout(() => navigate('/page6'), 1500);
    } catch (error) {
      console.error('Erreur calcul tarifs:', error);
      
      const effectifNum = Number(appState.effectif_global);
      const standardCalc = computePricing({ plan: 'standard', billingCycle: 'annual', headcount: effectifNum });
      const premiumCalc = computePricing({ plan: 'premium', billingCycle: 'annual', headcount: effectifNum });
      
      const standard_ttc = standardCalc.priceEUR;
      const premium_ttc = premiumCalc.priceEUR;
      const ht = standard_ttc / 1.09;
      const taxes = standard_ttc - ht;
      
      setAppState({ 
        ...appState, 
        tarifs: {
          standard_ttc,
          premium_ttc,
          promo_active: false,
          ht: Math.round(ht * 100) / 100,
          taxes: Math.round(taxes * 100) / 100
        }
      });
      
      toast({
        title: "Calcul effectué",
        description: "Tarifs calculés avec les paramètres par défaut.",
        variant: "default"
      });
      
      setTimeout(() => navigate('/page6'), 1500);
    }
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
      
      let isValid: boolean = false;
      switch (fieldName) {
        case 'siren':
          isValid = !!(tempData.siren && /^\d{9}$/.test(tempData.siren));
          break;
        case 'effectif_global':
          isValid = !!(tempData.effectif_global && tempData.effectif_global >= 20 && tempData.effectif_global <= 100);
          break;
        case 'ctn':
          isValid = !!(tempData.ctn && tempData.ctn !== 'B');
          break;
        case 'choix_garantie':
          isValid = !!tempData.choix_garantie;
          break;
      }
      
      if (isValid) {
        delete newErrors[fieldName];
        setErrors(newErrors);
      }
    }
  };

  const renderMissingFieldsForm = () => (
    <Card className="w-full max-w-3xl bg-white shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center font-astaneh text-2xl text-[#0f2f47]">
          <AlertTriangle className="w-6 h-6 mr-2 text-yellow-500" />
          Données manquantes pour la cotation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        {missingFields.includes('siren') && (
          <div>
            <Label htmlFor="siren" className={`font-bold text-[#0f2f47] ${getLabelClasses('siren')}`}>Numéro SIREN</Label>
            <Input 
              id="siren" 
              onChange={(e) => handleTempDataChange('siren', e.target.value)} 
              onFocus={() => handleFieldFocus('siren')}
              onBlur={() => handleFieldBlur('siren')}
              placeholder="9 chiffres" 
              className={getFieldClasses('siren')}
              aria-invalid={hasValidated && errors.siren ? "true" : "false"}
              aria-describedby={hasValidated && errors.siren ? "siren-error" : undefined}
            />
            {hasValidated && errors.siren && (
              <p id="siren-error" className="error-text">{errors.siren}</p>
            )}
          </div>
        )}
        {missingFields.includes('effectif_global') && (
          <div>
            <Label htmlFor="effectif_global" className={`font-bold text-[#0f2f47] ${getLabelClasses('effectif_global')}`}>Effectif global (20-100)</Label>
            <Input 
              id="effectif_global" 
              type="number" 
              onChange={(e) => handleTempDataChange('effectif_global', parseInt(e.target.value) || 0)}
              onFocus={() => handleFieldFocus('effectif_global')}
              onBlur={() => handleFieldBlur('effectif_global')}
              className={getFieldClasses('effectif_global')}
              aria-invalid={hasValidated && errors.effectif_global ? "true" : "false"}
              aria-describedby={hasValidated && errors.effectif_global ? "effectif_global-error" : undefined}
            />
            {hasValidated && errors.effectif_global && (
              <p id="effectif_global-error" className="error-text">{errors.effectif_global}</p>
            )}
          </div>
        )}
        {missingFields.includes('ctn') && (
          <div>
            <Label htmlFor="ctn" className={`font-bold text-[#0f2f47] ${getLabelClasses('ctn')}`}>CTN (Comité Technique National)</Label>
            <Select 
              onValueChange={(v) => {
                handleTempDataChange('ctn', v);
                if (hasValidated && v && v !== 'B') {
                  const newErrors = { ...errors };
                  delete newErrors.ctn;
                  setErrors(newErrors);
                }
              }}
            >
              <SelectTrigger 
                className={hasValidated && errors.ctn ? 'is-error' : ''}
                aria-invalid={hasValidated && errors.ctn ? "true" : "false"}
                aria-describedby={hasValidated && errors.ctn ? "ctn-error" : undefined}
              >
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">CTN A - Métallurgie</SelectItem>
                <SelectItem value="C">CTN C - Transports, EGE</SelectItem>
                <SelectItem value="D">CTN D - Services, commerces, industries de l'alimentation</SelectItem>
                <SelectItem value="E">CTN E - Verre, céramique, matériaux de construction</SelectItem>
                <SelectItem value="F">CTN F - Bois, ameublement, papier-carton, textile</SelectItem>
                <SelectItem value="G">CTN G - Chimie, caoutchouc, plasturgie</SelectItem>
                <SelectItem value="H">CTN H - Activités de services I</SelectItem>
                <SelectItem value="I">CTN I - Activités de services II</SelectItem>
              </SelectContent>
            </Select>
            {hasValidated && errors.ctn && (
              <p id="ctn-error" className="error-text">{errors.ctn}</p>
            )}
          </div>
        )}
        {missingFields.includes('choix_garantie') && (
          <div>
            <Label htmlFor="choix_garantie" className={`font-bold text-[#0f2f47] ${getLabelClasses('choix_garantie')}`}>Montant de garantie</Label>
            <Select 
              onValueChange={(v) => {
                handleTempDataChange('choix_garantie', parseInt(v));
                if (hasValidated && v) {
                  const newErrors = { ...errors };
                  delete newErrors.choix_garantie;
                  setErrors(newErrors);
                }
              }}
            >
              <SelectTrigger 
                className={hasValidated && errors.choix_garantie ? 'is-error' : ''}
                aria-invalid={hasValidated && errors.choix_garantie ? "true" : "false"}
                aria-describedby={hasValidated && errors.choix_garantie ? "choix_garantie-error" : undefined}
              >
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {[5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000].map(g => <SelectItem key={g} value={String(g)}>{g.toLocaleString()}€</SelectItem>)}
              </SelectContent>
            </Select>
            {hasValidated && errors.choix_garantie && (
              <p id="choix_garantie-error" className="error-text">{errors.choix_garantie}</p>
            )}
          </div>
        )}
        <div className="flex justify-end pt-4">
          <Button onClick={handleCompleteAndContinue} className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg">Compléter et Continuer</Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCalculationProgress = () => (
    <Card className="w-full max-w-3xl bg-white shadow-lg rounded-lg">
      <CardContent className="p-8 space-y-6">
        <div className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="2" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="#c19a5f" strokeWidth="2" strokeDasharray={`${progress} 100`} className="transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold font-astaneh text-[#0f2f47]">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const Icon = isCompleted ? CheckCircle : isActive ? Clock : Calculator;
            return (
              <div key={step.key} className={`flex items-center space-x-3 transition-colors duration-300 ${isCompleted ? 'text-green-600' : isActive ? 'text-[#c19a5f]' : 'text-gray-400'}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                <span className="text-base">{step.label}</span>
                {isCompleted && <span className="text-green-600 text-sm font-bold">✓</span>}
              </div>
            );
          })}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-[#c19a5f] h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-astaneh text-[#0f2f47]">
          {isCalculating ? "Calcul en cours" : "Finalisation de votre dossier"}
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          {isCalculating ? "Nous analysons vos données et calculons votre offre personnalisée…" : "Quelques informations sont nécessaires pour finaliser votre tarif."}
        </p>
      </div>
      {isCalculating ? renderCalculationProgress() : renderMissingFieldsForm()}
    </div>
  );
}
