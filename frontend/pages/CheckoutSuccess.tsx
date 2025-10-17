import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import backend from '~backend/client';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('Aucun identifiant de session trouvé');
      setLoading(false);
      return;
    }

    const fetchSessionData = async () => {
      try {
        const data = await backend.stripe.getSession({ sessionId });
        setSessionData(data);
      } catch (err: any) {
        console.error('Erreur lors de la récupération de la session:', err);
        setError(err.message || 'Impossible de récupérer les informations de paiement');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#0f2f47] mx-auto mb-4" />
          <p className="text-gray-600">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600 text-center">Erreur</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-700">{error}</p>
            <Button onClick={() => navigate('/')} className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-green-500 bg-green-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-astaneh text-green-800">
            Paiement réussi !
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-700 space-y-2">
            <p className="text-lg">Votre paiement a été effectué avec succès.</p>
            <p>Un email de confirmation vous a été envoyé.</p>
          </div>

          {sessionData && (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Statut :</span>
                <span className="font-medium text-green-600">
                  {sessionData.paymentStatus === 'paid' ? 'Payé' : sessionData.status}
                </span>
              </div>
              {sessionData.amountTotal && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant :</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: sessionData.currency?.toUpperCase() || 'EUR'
                    }).format(sessionData.amountTotal / 100)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">ID de transaction :</span>
                <span className="font-mono text-sm text-gray-500">{sessionData.sessionId}</span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Prochaines étapes :</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Vous recevrez votre contrat par email sous 24h</li>
              <li>Votre garantie prendra effet dès réception du contrat signé</li>
              <li>En cas de questions, contactez notre service client</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
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
