import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-orange-500 bg-orange-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-20 h-20 text-orange-600" />
          </div>
          <CardTitle className="text-3xl font-astaneh text-orange-800">
            Paiement annulé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-700 space-y-2">
            <p className="text-lg">Votre paiement a été annulé.</p>
            <p>Aucun montant n'a été débité de votre compte.</p>
          </div>

          <div className="bg-white rounded-lg p-4 space-y-2">
            <p className="text-gray-700">
              <strong>Que s'est-il passé ?</strong>
            </p>
            <p className="text-sm text-gray-600">
              Vous avez annulé le processus de paiement avant sa finalisation. 
              Si vous rencontrez des difficultés ou avez des questions, n'hésitez pas à nous contacter.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Besoin d'aide ?</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Contactez notre service client pour toute question</li>
              <li>Vérifiez que vos informations de paiement sont correctes</li>
              <li>Assurez-vous que votre carte dispose de fonds suffisants</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline"
              className="border-[#0f2f47] text-[#0f2f47] hover:bg-[#0f2f47] hover:text-white"
            >
              Réessayer le paiement
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]"
            >
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
