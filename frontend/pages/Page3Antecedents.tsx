import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { AppState } from '../App';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function Page3Antecedents({ appState, setAppState }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [antecedents, setAntecedents] = useState({ ip2: 0, ip3: 0, ip4: 0, deces: 0 });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [avertissementAccepted, setAvertissementAccepted] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    if (!appState.siren) navigate('/');
  }, [appState.siren, navigate]);

  const handleInteraction = () => {
    if (!hasInteracted) setHasInteracted(true);
  };

  const updateAntecedent = (field: keyof typeof antecedents, value: string) => {
    handleInteraction();
    setAntecedents(prev => ({ ...prev, [field]: Math.max(0, parseInt(value) || 0) }));
  };

  const handleSubmit = () => {
    setHasValidated(true);
    
    if (hasInteracted && !avertissementAccepted) {
      toast({ title: "Avertissement requis", description: "Veuillez lire et accepter l'avertissement.", variant: "destructive" });
      return;
    }
    setAppState({ ...appState, antecedents });
    navigate('/page4');
  };

  const getLabelClasses = (field?: string) => {
    if (field === 'avertissement' && hasValidated && hasInteracted && !avertissementAccepted) {
      return "is-error";
    }
    return "";
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-astaneh text-[#0f2f47]">Antécédents</h1>
        <p className="text-lg text-gray-600 mt-2">
          Ces informations sont disponibles dans votre compte employeur Ameli / risques professionnels.
        </p>
      </div>

      <Card className="w-full max-w-3xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 space-y-6">
          <div className="text-center text-gray-500 text-sm italic leading-relaxed">
            Veuillez vérifier sur votre compte employeur des 4 dernières années si vous n'avez pas eu l'une de ces catégories de sinistre. Merci de bien vouloir la renseigner.
          </div>

          {hasInteracted && (
            <Card className={`border-orange-200 bg-orange-50 ${hasValidated && !avertissementAccepted ? 'border-red-500' : ''}`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center mb-4">
                  <span className="text-orange-600 text-xl mr-2">⚠</span>
                  <h3 className="text-lg font-bold text-orange-800 font-astaneh">Avertissement</h3>
                </div>
                <div className="text-orange-800 leading-relaxed">
                  <p>Le souscripteur doit répondre avec sincérité... (articles L113-8 et L113-9)</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.keys(antecedents) as Array<keyof typeof antecedents>).map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-base font-bold text-[#0f2f47]">{key.toUpperCase()}</Label>
                <Input 
                  id={key} 
                  type="number" 
                  min="0" 
                  value={antecedents[key]} 
                  onFocus={handleInteraction} 
                  onChange={(e) => updateAntecedent(key, e.target.value)} 
                  placeholder="0" 
                />
              </div>
            ))}
          </div>

          {hasInteracted && (
            <div className={`flex items-center space-x-3 justify-center p-2 rounded ${hasValidated && !avertissementAccepted ? 'bg-yellow-50' : ''}`}>
              <Checkbox 
                id="avertissement" 
                checked={avertissementAccepted} 
                onCheckedChange={(c) => { 
                  setAvertissementAccepted(Boolean(c));
                }}
                aria-invalid={hasValidated && hasInteracted && !avertissementAccepted ? "true" : "false"}
                aria-describedby={hasValidated && hasInteracted && !avertissementAccepted ? "avertissement-error" : undefined}
              />
              <Label htmlFor="avertissement" className={`text-base font-medium cursor-pointer ${getLabelClasses('avertissement')}`}>
                J'ai lu et compris l'avertissement
              </Label>
            </div>
          )}
          {hasValidated && hasInteracted && !avertissementAccepted && (
            <p id="avertissement-error" className="error-text text-center -mt-2">Veuillez accepter l'avertissement pour continuer.</p>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={hasInteracted && !avertissementAccepted} className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg">VALIDER</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
