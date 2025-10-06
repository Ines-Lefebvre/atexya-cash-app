import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';
import { AppState } from '../App';
import { Shield } from 'lucide-react';

interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function Page1Identification({ appState, setAppState }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [siren, setSiren] = useState('');
  const [companyData, setCompanyData] = useState<any>(null);
  const [apiFailed, setApiFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [manualData, setManualData] = useState({ nom: '', adresse: '', code_postal: '', ville: '' });
  const [hasBroker, setHasBroker] = useState('non');
  const [brokerCode, setBrokerCode] = useState('');
  const [ctn, setCtn] = useState('');
  const [rgpdAccepted, setRgpdAccepted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasValidated, setHasValidated] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const firstErrorRef = useRef<HTMLInputElement | HTMLButtonElement | null>(null);

  useEffect(() => {
    const urlBrokerCode = searchParams.get('broker_code');
    if (urlBrokerCode) {
      setHasBroker('oui');
      setBrokerCode(urlBrokerCode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hasValidated) return;

    const newErrors: Record<string, string> = {};
    if (!/^\d{9}$/.test(siren)) {
      newErrors.siren = "Le numéro SIREN doit contenir 9 chiffres.";
    }
    if (!ctn) {
      newErrors.ctn = "Veuillez sélectionner un CTN.";
    }
    if (hasBroker === 'oui' && !brokerCode) {
      newErrors.brokerCode = "Le code courtier est requis.";
    }
    if (!rgpdAccepted) {
      newErrors.rgpd = "Vous devez accepter le traitement des données.";
    }

    // Manual data validation when API failed
    if (apiFailed) {
      if (!manualData.nom.trim()) {
        newErrors.manualNom = "Le nom de l'entreprise est requis.";
      }
      if (!manualData.adresse.trim()) {
        newErrors.manualAdresse = "L'adresse est requise.";
      }
      if (!/^\d{5}$/.test(manualData.code_postal)) {
        newErrors.manualCodePostal = "Le code postal doit contenir 5 chiffres.";
      }
      if (!manualData.ville.trim()) {
        newErrors.manualVille = "La ville est requise.";
      }
    }

    setErrors(newErrors);
  }, [siren, ctn, hasBroker, brokerCode, rgpdAccepted, apiFailed, manualData, hasValidated]);

  useEffect(() => {
    if (hasValidated && Object.keys(errors).length > 0 && firstErrorRef.current) {
      firstErrorRef.current.focus();
      firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errors, hasValidated]);

  const handleSirenSearch = async () => {
    if (!/^\d{9}$/.test(siren)) {
      setErrors(prev => ({ ...prev, siren: "Le numéro SIREN doit contenir 9 chiffres." }));
      return;
    }
    setLoading(true);
    try {
      const response = await backend.atexya.searchCompany({ siren });
      if (response.api_failed) {
        setApiFailed(true);
        setCompanyData(null);
        toast({ title: "API indisponible", description: "Veuillez saisir manuellement les informations.", variant: "destructive" });
      } else {
        setApiFailed(false);
        setCompanyData(response);
      }
    } catch (error) {
      console.error('Erreur API Pappers:', error);
      setApiFailed(true);
      setCompanyData(null);
      toast({ title: "Erreur", description: "Impossible de récupérer les données.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (ctn === 'B') {
      navigate('/contact', { state: { message: "Le secteur BTP (CTN B) nécessite une étude personnalisée. Veuillez nous contacter pour obtenir un devis." } });
      return;
    }

    setHasValidated(true);
    
    // Calcul des erreurs immédiatement
    const newErrors: Record<string, string> = {};
    if (!/^\d{9}$/.test(siren)) {
      newErrors.siren = "Le numéro SIREN doit contenir 9 chiffres.";
    }
    if (!ctn) {
      newErrors.ctn = "Veuillez sélectionner un CTN.";
    }
    if (hasBroker === 'oui' && !brokerCode) {
      newErrors.brokerCode = "Le code courtier est requis.";
    }
    if (!rgpdAccepted) {
      newErrors.rgpd = "Vous devez accepter le traitement des données.";
    }

    // Manual data validation when API failed
    if (apiFailed) {
      if (!manualData.nom.trim()) {
        newErrors.manualNom = "Le nom de l'entreprise est requis.";
      }
      if (!manualData.adresse.trim()) {
        newErrors.manualAdresse = "L'adresse est requise.";
      }
      if (!/^\d{5}$/.test(manualData.code_postal)) {
        newErrors.manualCodePostal = "Le code postal doit contenir 5 chiffres.";
      }
      if (!manualData.ville.trim()) {
        newErrors.manualVille = "La ville est requise.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({ title: "Formulaire incomplet", description: "Veuillez corriger les erreurs avant de continuer.", variant: "destructive" });
      return;
    }

    const newState: AppState = {
      ...appState,
      siren,
      company_data: companyData ? companyData.company_data : { 
        denomination: manualData.nom,
        adresse: manualData.adresse,
        code_postal: manualData.code_postal,
        ville: manualData.ville,
        code_naf: '', 
        forme_juridique: '' 
      },
      etablissements: companyData ? companyData.etablissements : [],
      api_failed: apiFailed,
      ctn,
      broker_code: hasBroker === 'oui' ? brokerCode : null
    };
    setAppState(newState);
    navigate('/page2');
  };

  const getFieldClasses = (field: string) => {
    const hasError = hasValidated && errors[field];
    const isActive = activeField === field;
    const baseClasses = "flex-1";
    
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
        case 'siren':
          isValid = /^\d{9}$/.test(siren);
          break;
        case 'ctn':
          isValid = !!ctn;
          break;
        case 'brokerCode':
          isValid = hasBroker !== 'oui' || brokerCode.trim() !== '';
          break;
        case 'rgpd':
          isValid = rgpdAccepted;
          break;
        case 'manualNom':
          isValid = manualData.nom.trim() !== '';
          break;
        case 'manualAdresse':
          isValid = manualData.adresse.trim() !== '';
          break;
        case 'manualCodePostal':
          isValid = /^\d{5}$/.test(manualData.code_postal);
          break;
        case 'manualVille':
          isValid = manualData.ville.trim() !== '';
          break;
      }
      
      if (isValid) {
        delete newErrors[fieldName];
        setErrors(newErrors);
      }
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-astaneh text-[#0f2f47]">
          Identification de votre entreprise
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Commencez par renseigner votre numéro SIREN.
        </p>
      </div>

      <Card className="w-full max-w-3xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="siren" className={`font-bold text-[#0f2f47] ${getLabelClasses('siren')}`}>
              Numéro SIREN *
            </Label>
            <div className="flex space-x-4">
              <Input
                id="siren"
                ref={el => { if (hasValidated && errors.siren && !firstErrorRef.current) { firstErrorRef.current = el; } }}
                value={siren}
                onChange={(e) => setSiren(e.target.value.replace(/\D/g, ''))}
                onFocus={() => handleFieldFocus('siren')}
                onBlur={() => handleFieldBlur('siren')}
                placeholder="9 chiffres"
                className={getFieldClasses('siren')}
                maxLength={9}
                aria-invalid={hasValidated && errors.siren ? "true" : "false"}
                aria-describedby={hasValidated && errors.siren ? "siren-error" : undefined}
              />
              <Button onClick={handleSirenSearch} disabled={!/^\d{9}$/.test(siren) || loading} className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]">
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
            {hasValidated && errors.siren && (
              <p id="siren-error" className="error-text">{errors.siren}</p>
            )}
          </div>

          {companyData && !apiFailed && (
            <Card className="border-green-500 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-bold text-green-800 mb-2 font-astaneh">
                  Entreprise trouvée
                </h3>
                <div className="text-sm text-green-700 font-opensans">
                  <p><strong>Nom :</strong> {companyData.company_data.denomination}</p>
                  <p><strong>Adresse :</strong> {companyData.company_data.adresse}, {companyData.company_data.code_postal} {companyData.company_data.ville}</p>
                  <p><strong>Code NAF :</strong> {companyData.company_data.code_naf}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {apiFailed && (
            <Card className="border-orange-500 bg-orange-50">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-bold text-orange-800 font-astaneh">
                  Saisie manuelle requise
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual-nom" className={`font-bold text-[#0f2f47] ${getLabelClasses('manualNom')}`}>
                      Nom de l'entreprise *
                    </Label>
                    <Input
                      id="manual-nom"
                      ref={el => { if (hasValidated && errors.manualNom && !firstErrorRef.current) { firstErrorRef.current = el; } }}
                      value={manualData.nom}
                      onChange={(e) => setManualData(prev => ({ ...prev, nom: e.target.value }))}
                      onFocus={() => handleFieldFocus('manualNom')}
                      onBlur={() => handleFieldBlur('manualNom')}
                      className={getFieldClasses('manualNom')}
                      aria-invalid={hasValidated && errors.manualNom ? "true" : "false"}
                      aria-describedby={hasValidated && errors.manualNom ? "manual-nom-error" : undefined}
                    />
                    {hasValidated && errors.manualNom && (
                      <p id="manual-nom-error" className="error-text">{errors.manualNom}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-adresse" className={`font-bold text-[#0f2f47] ${getLabelClasses('manualAdresse')}`}>
                      Adresse *
                    </Label>
                    <Input
                      id="manual-adresse"
                      ref={el => { if (hasValidated && errors.manualAdresse && !firstErrorRef.current) { firstErrorRef.current = el; } }}
                      value={manualData.adresse}
                      onChange={(e) => setManualData(prev => ({ ...prev, adresse: e.target.value }))}
                      onFocus={() => handleFieldFocus('manualAdresse')}
                      onBlur={() => handleFieldBlur('manualAdresse')}
                      className={getFieldClasses('manualAdresse')}
                      aria-invalid={hasValidated && errors.manualAdresse ? "true" : "false"}
                      aria-describedby={hasValidated && errors.manualAdresse ? "manual-adresse-error" : undefined}
                    />
                    {hasValidated && errors.manualAdresse && (
                      <p id="manual-adresse-error" className="error-text">{errors.manualAdresse}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-code-postal" className={`font-bold text-[#0f2f47] ${getLabelClasses('manualCodePostal')}`}>
                      Code postal *
                    </Label>
                    <Input
                      id="manual-code-postal"
                      ref={el => { if (hasValidated && errors.manualCodePostal && !firstErrorRef.current) { firstErrorRef.current = el; } }}
                      value={manualData.code_postal}
                      onChange={(e) => setManualData(prev => ({ ...prev, code_postal: e.target.value.replace(/\D/g, '') }))}
                      onFocus={() => handleFieldFocus('manualCodePostal')}
                      onBlur={() => handleFieldBlur('manualCodePostal')}
                      className={getFieldClasses('manualCodePostal')}
                      maxLength={5}
                      aria-invalid={hasValidated && errors.manualCodePostal ? "true" : "false"}
                      aria-describedby={hasValidated && errors.manualCodePostal ? "manual-code-postal-error" : undefined}
                    />
                    {hasValidated && errors.manualCodePostal && (
                      <p id="manual-code-postal-error" className="error-text">{errors.manualCodePostal}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-ville" className={`font-bold text-[#0f2f47] ${getLabelClasses('manualVille')}`}>
                      Ville *
                    </Label>
                    <Input
                      id="manual-ville"
                      ref={el => { if (hasValidated && errors.manualVille && !firstErrorRef.current) { firstErrorRef.current = el; } }}
                      value={manualData.ville}
                      onChange={(e) => setManualData(prev => ({ ...prev, ville: e.target.value }))}
                      onFocus={() => handleFieldFocus('manualVille')}
                      onBlur={() => handleFieldBlur('manualVille')}
                      className={getFieldClasses('manualVille')}
                      aria-invalid={hasValidated && errors.manualVille ? "true" : "false"}
                      aria-describedby={hasValidated && errors.manualVille ? "manual-ville-error" : undefined}
                    />
                    {hasValidated && errors.manualVille && (
                      <p id="manual-ville-error" className="error-text">{errors.manualVille}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="ctn" className={`font-bold text-[#0f2f47] ${getLabelClasses('ctn')}`}>
              CTN (Comité Technique National) *
            </Label>
            <Select 
              value={ctn} 
              onValueChange={(value) => {
                setCtn(value);
                if (hasValidated && value) {
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
                <SelectValue placeholder="Sélectionnez votre CTN" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">CTN A - Métallurgie</SelectItem>
                <SelectItem value="B">CTN B - BTP</SelectItem>
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

          <div className="space-y-2">
            <Label className="font-bold text-[#0f2f47]">Avez-vous un courtier ? *</Label>
            <RadioGroup 
              value={hasBroker} 
              onValueChange={(value) => {
                setHasBroker(value);
                if (value === 'non') {
                  setBrokerCode('');
                  if (hasValidated && errors.brokerCode) {
                    const newErrors = { ...errors };
                    delete newErrors.brokerCode;
                    setErrors(newErrors);
                  }
                }
              }}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oui" id="broker-yes" />
                <Label htmlFor="broker-yes">Oui</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="non" id="broker-no" />
                <Label htmlFor="broker-no">Non</Label>
              </div>
            </RadioGroup>
            {hasBroker === 'oui' && (
              <div className="pt-2">
                <Label htmlFor="broker-code" className={`font-bold text-[#0f2f47] ${getLabelClasses('brokerCode')}`}>
                  Code courtier Atexya
                </Label>
                <Input 
                  id="broker-code" 
                  ref={el => { if (hasValidated && errors.brokerCode && !firstErrorRef.current) { firstErrorRef.current = el; } }}
                  value={brokerCode} 
                  onChange={(e) => setBrokerCode(e.target.value)}
                  onFocus={() => handleFieldFocus('brokerCode')}
                  onBlur={() => handleFieldBlur('brokerCode')}
                  className={getFieldClasses('brokerCode')}
                  aria-invalid={hasValidated && errors.brokerCode ? "true" : "false"}
                  aria-describedby={hasValidated && errors.brokerCode ? "broker-code-error" : undefined}
                />
                {hasValidated && errors.brokerCode && (
                  <p id="broker-code-error" className="error-text">{errors.brokerCode}</p>
                )}
              </div>
            )}
          </div>

          <Card className="bg-gray-100 border-gray-200">
            <CardContent className="p-6 flex items-start space-x-4">
              <div>
                <Shield className="w-8 h-8 text-[#c19a5f]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#0f2f47] mb-2 font-astaneh">
                  RGPD — Protection de vos données
                </h3>
                <div className="text-sm text-gray-600 space-y-1 mb-4 font-opensans">
                  <p>Vos données sont utilisées uniquement pour établir un devis Atexya cash.</p>
                  <p>En cas de non-souscription, elles sont automatiquement purgées.</p>
                  <p>Aucune donnée bancaire n'est collectée sur ce site (paiement sécurisé via Stripe).</p>
                </div>
                <div className={`flex items-center space-x-2 ${hasValidated && errors.rgpd ? 'p-2 rounded bg-yellow-50' : ''}`}>
                  <Checkbox 
                    id="rgpd" 
                    checked={rgpdAccepted} 
                    onCheckedChange={(c) => {
                      setRgpdAccepted(Boolean(c));
                      if (hasValidated && Boolean(c)) {
                        const newErrors = { ...errors };
                        delete newErrors.rgpd;
                        setErrors(newErrors);
                      }
                    }}
                    aria-invalid={hasValidated && errors.rgpd ? "true" : "false"}
                    aria-describedby={hasValidated && errors.rgpd ? "rgpd-error" : undefined}
                  />
                  <Label htmlFor="rgpd" className={`${getLabelClasses('rgpd')} cursor-pointer`}>
                    J’ai lu et j’accepte la protection de mes données telle que décrite ci-dessus *
                  </Label>
                </div>
                {hasValidated && errors.rgpd && (
                  <p id="rgpd-error" className="error-text mt-2">{errors.rgpd}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg"
            >
              VALIDER
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
