import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AppState } from '../App';

interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

const garantieOptions = [
  5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000
];

export default function Page4Garantie({ appState, setAppState }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedGarantie, setSelectedGarantie] = useState<number>(0);
  const [availableGaranties, setAvailableGaranties] = useState<number[]>([]);
  const [typeInfo, setTypeInfo] = useState<string>('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!appState.siren || !appState.effectif_global) {
      navigate('/');
      return;
    }

    const effectif = appState.effectif_global;
    if (effectif < 20 || effectif > 100) {
      navigate('/contact', { state: { message: `Votre effectif (${effectif}) est hors des critères (20-100).` } });
      return;
    }

    let available = [...garantieOptions];
    if (effectif <= 30) {
      available = available.filter(g => g <= 30000);
    } else if (effectif >= 70) {
      available = available.filter(g => g >= 30000);
    }
    setAvailableGaranties(available);

    setTypeInfo(effectif <= 60 ? 'Type de garantie : IP3 & IP4' : 'Type de garantie : IP4 seul');
  }, [appState, navigate]);

  const handleSubmit = () => {
    if (selectedGarantie === 0) {
      setShowError(true);
      toast({ title: "Sélection requise", description: "Veuillez choisir un montant de garantie.", variant: "destructive" });
      return;
    }
    setAppState({ ...appState, choix_garantie: selectedGarantie });
    navigate('/page5');
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-astaneh text-[#0f2f47]">Choix de Garantie</h1>
        <p className="text-lg text-gray-600 mt-2">Sélectionnez le montant de garantie standard pour votre activité.</p>
      </div>

      <Card className="w-full max-w-4xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-800 font-bold">Effectif : {appState.effectif_global} salarié(s)</p>
            <p className="text-blue-700 text-sm mt-2">{typeInfo}</p>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-2 rounded ${showError ? 'border-2 border-red-500 bg-yellow-50' : ''}`}>
            {availableGaranties.map((montant) => (
              <Card key={montant} className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedGarantie === montant ? 'border-2 border-[#c19a5f] bg-[#c19a5f] text-white' : 'border-gray-200 hover:border-[#c19a5f]'}`} onClick={() => { setSelectedGarantie(montant); setShowError(false); }}>
                <CardContent className="p-6 text-center">
                  <div className={`text-2xl font-bold mb-2 font-astaneh ${selectedGarantie === montant ? 'text-white' : 'text-[#0f2f47]'}`}>{formatCurrency(montant)}</div>
                  <p className={`text-sm ${selectedGarantie === montant ? 'text-white' : 'text-gray-600'}`}>de garantie</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {showError && <p className="text-center text-red-500 text-sm">Veuillez sélectionner une garantie.</p>}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={selectedGarantie === 0} className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg">VALIDER</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
