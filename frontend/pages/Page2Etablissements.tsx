import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AppState } from '../App';

interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

interface Etablissement {
  siret: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  salaries: number;
}

export default function Page2Etablissements({ appState, setAppState }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasValidated, setHasValidated] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const firstErrorRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!appState.siren) {
      navigate('/');
      return;
    }
    
    const normalizeEtab = (etab: any): Etablissement => {
      let salariesCount = 0;
      if (typeof etab.salaries === 'number' && Number.isInteger(etab.salaries) && etab.salaries > 0) {
        salariesCount = etab.salaries;
      } else if (typeof etab.salaries === 'string') {
        const parsed = parseInt(etab.salaries, 10);
        salariesCount = !isNaN(parsed) && parsed > 0 ? parsed : 0;
      }
      
      return {
        siret: etab.siret,
        nom: etab.nom,
        adresse: etab.adresse,
        code_postal: etab.code_postal,
        ville: etab.ville,
        salaries: salariesCount
      };
    };
    
    const initialEtab = appState.api_failed
      ? { siret: appState.siren + '00019', nom: appState.company_data.denomination, adresse: appState.company_data.adresse, code_postal: appState.company_data.code_postal, ville: appState.company_data.ville, salaries: 0 }
      : appState.etablissements.length > 0 ? normalizeEtab(appState.etablissements[0]) : null;
      
    if (initialEtab) {
      setEtablissements([initialEtab]);
    } else {
      const defaultEtab: Etablissement = {
        siret: appState.siren + '00019',
        nom: appState.company_data.denomination,
        adresse: appState.company_data.adresse,
        code_postal: appState.company_data.code_postal,
        ville: appState.company_data.ville,
        salaries: 0
      };
      setEtablissements([defaultEtab]);
    }
  }, [appState, navigate]);

  useEffect(() => {
    if (!hasValidated) return;

    const newErrors: Record<string, string> = {};
    
    etablissements.forEach((etab, index) => {
      if (!etab.siret || etab.siret.length !== 14) newErrors[`siret_${index}`] = "Le SIRET doit contenir 14 chiffres.";
      if (!(etab.nom || '').trim()) newErrors[`nom_${index}`] = "Le nom est obligatoire.";
      if (!(etab.adresse || '').trim()) newErrors[`adresse_${index}`] = "L'adresse est obligatoire.";
      if (!etab.code_postal || etab.code_postal.length !== 5) newErrors[`code_postal_${index}`] = "Le code postal doit contenir 5 chiffres.";
      if (!(etab.ville || '').trim()) newErrors[`ville_${index}`] = "La ville est obligatoire.";
      if (etab.salaries === undefined || etab.salaries < 1 || !Number.isInteger(etab.salaries)) newErrors[`salaries_${index}`] = "Le nombre de salariés doit être d'au moins 1.";
    });

    const effectifGlobal = getEffectifGlobal();
    if (effectifGlobal < 20) {
      newErrors.effectif_global = "L'effectif global doit être d'au moins 20.";
    }

    setErrors(newErrors);
  }, [etablissements, hasValidated]);

  useEffect(() => {
    if (hasValidated && Object.keys(errors).length > 0 && firstErrorRef.current) {
      firstErrorRef.current.focus();
      firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errors, hasValidated]);

  const getEffectifGlobal = () => {
    return etablissements.reduce((total, etab) => {
      const salaries = typeof etab.salaries === 'number' ? etab.salaries : Number(etab.salaries) || 0;
      return total + salaries;
    }, 0);
  };

  const updateEtablissement = (index: number, field: keyof Etablissement, value: string | number) => {
    setEtablissements(prev => 
      prev.map((etab, i) => 
        i === index ? { ...etab, [field]: value } : etab
      )
    );
  };

  const addEtablissement = () => {
    const newEtab: Etablissement = {
      siret: appState.siren + `000${etablissements.length + 1}`.slice(-2),
      nom: appState.company_data.denomination,
      adresse: '',
      code_postal: '',
      ville: '',
      salaries: 0
    };
    setEtablissements(prev => [...prev, newEtab]);
  };

  const removeEtablissement = (index: number) => {
    if (etablissements.length <= 1) {
      toast({
        title: "Impossible de supprimer",
        description: "Vous devez avoir au moins un établissement.",
        variant: "destructive"
      });
      return;
    }
    setEtablissements(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    setHasValidated(true);
    
    if (etablissements.length === 0) {
      toast({ title: "Aucun établissement", description: "Vous devez avoir au moins un établissement.", variant: "destructive" });
      return;
    }

    const effectifGlobal = getEffectifGlobal();
    
    if (effectifGlobal > 100) {
      navigate('/contact', { state: { message: `Votre effectif global (${effectifGlobal}) est supérieur à 100. Notre équipe doit étudier votre dossier.` } });
      return;
    }

    // Calcul des erreurs immédiatement
    const newErrors: Record<string, string> = {};
    
    etablissements.forEach((etab, index) => {
      if (!etab.siret || etab.siret.length !== 14) newErrors[`siret_${index}`] = "Le SIRET doit contenir 14 chiffres.";
      if (!(etab.nom || '').trim()) newErrors[`nom_${index}`] = "Le nom est obligatoire.";
      if (!(etab.adresse || '').trim()) newErrors[`adresse_${index}`] = "L'adresse est obligatoire.";
      if (!etab.code_postal || etab.code_postal.length !== 5) newErrors[`code_postal_${index}`] = "Le code postal doit contenir 5 chiffres.";
      if (!(etab.ville || '').trim()) newErrors[`ville_${index}`] = "La ville est obligatoire.";
      if (etab.salaries === undefined || etab.salaries < 1 || !Number.isInteger(etab.salaries)) newErrors[`salaries_${index}`] = "Le nombre de salariés doit être d'au moins 1.";
    });

    if (effectifGlobal < 20) {
      newErrors.effectif_global = "L'effectif global doit être d'au moins 20.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast({ title: "Formulaire invalide", description: "Veuillez corriger les erreurs.", variant: "destructive" });
      return;
    }

    setAppState({ ...appState, etablissements, effectif_global: effectifGlobal });
    navigate('/page3');
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
      
      const [fieldType, indexStr] = fieldName.split('_');
      const index = parseInt(indexStr);
      const etab = etablissements[index];
      
      if (!etab) return;
      
      let isValid: boolean = false;
      switch (fieldType) {
        case 'siret':
          isValid = !!(etab.siret && etab.siret.length === 14);
          break;
        case 'nom':
          isValid = (etab.nom || '').trim() !== '';
          break;
        case 'adresse':
          isValid = (etab.adresse || '').trim() !== '';
          break;
        case 'code':
          isValid = !!(etab.code_postal && etab.code_postal.length === 5);
          break;
        case 'ville':
          isValid = (etab.ville || '').trim() !== '';
          break;
        case 'salaries':
          isValid = etab.salaries >= 1 && Number.isInteger(etab.salaries);
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
        <h1 className="text-4xl font-astaneh text-[#0f2f47]">Établissements</h1>
        <p className="text-lg text-gray-600 mt-2">Veuillez bien vouloir renseigner les informations concernant vos établissements actifs.</p>
      </div>

      <Card className="w-full max-w-5xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 space-y-6">
          {/* Effectif Global Card */}
          <Card className={`${getEffectifGlobal() >= 20 && Object.keys(errors).filter(k => !k.startsWith('effectif_global')).length === 0 ? 'border-[#c19a5f]' : 'border-gray-200'}`}>
            <CardContent className="p-6 text-center">
              <h3 className="text-xl font-bold text-[#0f2f47] mb-2 font-astaneh">Effectif global</h3>
              <div className={`text-3xl font-bold ${getEffectifGlobal() >= 20 ? 'text-[#c19a5f]' : 'text-red-500'}`} style={{ fontFamily: 'Astaneh Bold, sans-serif' }}>
                {getEffectifGlobal()} salarié(s)
              </div>
              {hasValidated && errors.effectif_global && (
                <p className="error-text mt-2">{errors.effectif_global}</p>
              )}
            </CardContent>
          </Card>

          {/* Add Establishment Button */}
          <div className="flex justify-start">
            <Button 
              onClick={addEtablissement} 
              variant="outline" 
              className="border-[#c19a5f] text-[#c19a5f] hover:bg-[#c19a5f] hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Ajouter un établissement
            </Button>
          </div>

          {/* Establishments List */}
          <div className="space-y-6">
            {etablissements.map((etab, index) => (
              <Card key={index} className="border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold text-[#0f2f47] font-astaneh">
                    {index === 0 ? 'Établissement Principal' : `Établissement ${index + 1}`}
                  </CardTitle>
                  {etablissements.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeEtablissement(index)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <Label htmlFor={`siret_${index}`} className={`font-bold text-[#0f2f47] ${getLabelClasses(`siret_${index}`)}`}>
                        SIRET (14 chiffres) *
                      </Label>
                      <Input 
                        id={`siret_${index}`}
                        ref={hasValidated && errors[`siret_${index}`] && !firstErrorRef.current ? firstErrorRef : null} 
                        value={etab.siret} 
                        onChange={(e) => updateEtablissement(index, 'siret', e.target.value.replace(/\D/g, '').slice(0, 14))}
                        onFocus={() => handleFieldFocus(`siret_${index}`)}
                        onBlur={() => handleFieldBlur(`siret_${index}`)}
                        className={getFieldClasses(`siret_${index}`)}
                        maxLength={14}
                        aria-invalid={hasValidated && errors[`siret_${index}`] ? "true" : "false"}
                        aria-describedby={hasValidated && errors[`siret_${index}`] ? `siret_${index}_error` : undefined}
                      />
                      {hasValidated && errors[`siret_${index}`] && (
                        <p id={`siret_${index}_error`} className="error-text">{errors[`siret_${index}`]}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`nom_${index}`} className={`font-bold text-[#0f2f47] ${getLabelClasses(`nom_${index}`)}`}>
                        Nom société *
                      </Label>
                      <Input 
                        id={`nom_${index}`}
                        ref={hasValidated && errors[`nom_${index}`] && !firstErrorRef.current ? firstErrorRef : null} 
                        value={etab.nom} 
                        onChange={(e) => updateEtablissement(index, 'nom', e.target.value)}
                        onFocus={() => handleFieldFocus(`nom_${index}`)}
                        onBlur={() => handleFieldBlur(`nom_${index}`)}
                        className={getFieldClasses(`nom_${index}`)}
                        aria-invalid={hasValidated && errors[`nom_${index}`] ? "true" : "false"}
                        aria-describedby={hasValidated && errors[`nom_${index}`] ? `nom_${index}_error` : undefined}
                      />
                      {hasValidated && errors[`nom_${index}`] && (
                        <p id={`nom_${index}_error`} className="error-text">{errors[`nom_${index}`]}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`adresse_${index}`} className={`font-bold text-[#0f2f47] ${getLabelClasses(`adresse_${index}`)}`}>
                        Adresse *
                      </Label>
                      <Input 
                        id={`adresse_${index}`}
                        ref={hasValidated && errors[`adresse_${index}`] && !firstErrorRef.current ? firstErrorRef : null} 
                        value={etab.adresse} 
                        onChange={(e) => updateEtablissement(index, 'adresse', e.target.value)}
                        onFocus={() => handleFieldFocus(`adresse_${index}`)}
                        onBlur={() => handleFieldBlur(`adresse_${index}`)}
                        className={getFieldClasses(`adresse_${index}`)}
                        aria-invalid={hasValidated && errors[`adresse_${index}`] ? "true" : "false"}
                        aria-describedby={hasValidated && errors[`adresse_${index}`] ? `adresse_${index}_error` : undefined}
                      />
                      {hasValidated && errors[`adresse_${index}`] && (
                        <p id={`adresse_${index}_error`} className="error-text">{errors[`adresse_${index}`]}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`code_postal_${index}`} className={`font-bold text-[#0f2f47] ${getLabelClasses(`code_postal_${index}`)}`}>
                        Code postal *
                      </Label>
                      <Input 
                        id={`code_postal_${index}`}
                        ref={hasValidated && errors[`code_postal_${index}`] && !firstErrorRef.current ? firstErrorRef : null} 
                        value={etab.code_postal} 
                        onChange={(e) => updateEtablissement(index, 'code_postal', e.target.value.replace(/\D/g, '').slice(0, 5))}
                        onFocus={() => handleFieldFocus(`code_postal_${index}`)}
                        onBlur={() => handleFieldBlur(`code_postal_${index}`)}
                        className={getFieldClasses(`code_postal_${index}`)}
                        maxLength={5}
                        aria-invalid={hasValidated && errors[`code_postal_${index}`] ? "true" : "false"}
                        aria-describedby={hasValidated && errors[`code_postal_${index}`] ? `code_postal_${index}_error` : undefined}
                      />
                      {hasValidated && errors[`code_postal_${index}`] && (
                        <p id={`code_postal_${index}_error`} className="error-text">{errors[`code_postal_${index}`]}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`ville_${index}`} className={`font-bold text-[#0f2f47] ${getLabelClasses(`ville_${index}`)}`}>
                        Ville *
                      </Label>
                      <Input 
                        id={`ville_${index}`}
                        ref={hasValidated && errors[`ville_${index}`] && !firstErrorRef.current ? firstErrorRef : null} 
                        value={etab.ville} 
                        onChange={(e) => updateEtablissement(index, 'ville', e.target.value)}
                        onFocus={() => handleFieldFocus(`ville_${index}`)}
                        onBlur={() => handleFieldBlur(`ville_${index}`)}
                        className={getFieldClasses(`ville_${index}`)}
                        aria-invalid={hasValidated && errors[`ville_${index}`] ? "true" : "false"}
                        aria-describedby={hasValidated && errors[`ville_${index}`] ? `ville_${index}_error` : undefined}
                      />
                      {hasValidated && errors[`ville_${index}`] && (
                        <p id={`ville_${index}_error`} className="error-text">{errors[`ville_${index}`]}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor={`salaries_${index}`} className={`font-bold text-[#0f2f47] ${getLabelClasses(`salaries_${index}`)}`}>
                        Effectif *
                      </Label>
                      <Input 
                        id={`salaries_${index}`}
                        ref={hasValidated && errors[`salaries_${index}`] && !firstErrorRef.current ? firstErrorRef : null} 
                        value={etab.salaries} 
                        onChange={(e) => updateEtablissement(index, 'salaries', parseInt(e.target.value) || 0)}
                        onFocus={() => handleFieldFocus(`salaries_${index}`)}
                        onBlur={() => handleFieldBlur(`salaries_${index}`)}
                        className={getFieldClasses(`salaries_${index}`)}
                        type="number"
                        min="1"
                        aria-invalid={hasValidated && errors[`salaries_${index}`] ? "true" : "false"}
                        aria-describedby={hasValidated && errors[`salaries_${index}`] ? `salaries_${index}_error` : undefined}
                      />
                      {hasValidated && errors[`salaries_${index}`] && (
                        <p id={`salaries_${index}_error`} className="error-text">{errors[`salaries_${index}`]}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSubmit} 
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
