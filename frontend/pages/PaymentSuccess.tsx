import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, FileText, Mail, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import backend from '~backend/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setStatus('error');
        return;
      }

      try {
        // Récupérer uniquement le statut de la session Stripe
        const sessionResponse = await backend.stripe.getSession({ sessionId });

        if (sessionResponse.status === 'complete' && sessionResponse.paymentStatus === 'paid') {
          setStatus('success');
          setPaymentAmount(sessionResponse.amountTotal || 0);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Erreur vérification paiement:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [sessionId]);

  const formatCurrency = (amountCents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amountCents / 100);
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <>
          <Loader2 className="w-16 h-16 mx-auto text-[#c19a5f] animate-spin" />
          <h1 className="text-4xl font-astaneh text-[#0f2f47] mt-6">
            Vérification du paiement...
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Veuillez patienter pendant que nous vérifions votre paiement.
          </p>
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
          <h1 className="text-4xl font-astaneh text-[#0f2f47] mt-6">
            Problème avec le paiement
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Il y a eu un problème avec votre paiement. Veuillez contacter notre support.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Link to="/page6">
              <Button className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-6 py-3 text-lg">
                Retenter
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-[#c19a5f] text-[#c19a5f] hover:bg-[#c19a5f] hover:text-white px-6 py-3 text-lg">
                Contacter le support
              </Button>
            </Link>
          </div>
        </>
      );
    }

    return (
      <>
        <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
        <h1 className="text-4xl font-astaneh text-[#0f2f47] mt-6">
          Paiement confirmé !
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Merci pour votre confiance. Votre contrat d'assurance est maintenant actif.
        </p>

        <Card className="border-green-500 bg-green-50 my-8 text-left">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-green-800 mb-4 font-astaneh">
              Confirmation de paiement
            </h3>
            <div className="grid grid-cols-1 gap-4 text-sm text-green-700">
              <div><strong>Montant payé :</strong> {formatCurrency(paymentAmount)}</div>
              <div><strong>Statut :</strong> Payé avec succès</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                Contrat actif
              </h3>
              <p className="text-gray-600 text-sm">
                Votre couverture est effective immédiatement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Download className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                Documents
              </h3>
              <p className="text-gray-600 text-sm">
                Facture et attestation par email
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Mail className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                Support client
              </h3>
              <p className="text-gray-600 text-sm">
                Assistance disponible 24h/24
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-green-500 bg-green-50 my-8">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-bold text-green-800 mb-2 font-astaneh">
              Prochaines étapes
            </h3>
            <div className="text-green-700 text-sm space-y-1">
              <p>1. Vous recevrez un email de confirmation avec votre facture</p>
              <p>2. Votre attestation d'assurance sera envoyée sous 24h</p>
              <p>3. Conservez précieusement ces documents</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center space-x-4 pt-4">
          <Link to="/">
            <Button className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg">
              Retour à l'accueil
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" className="border-[#c19a5f] text-[#c19a5f] hover:bg-[#c19a5f] hover:text-white px-8 py-3 text-lg">
              Nous contacter
            </Button>
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <Card className="w-full max-w-4xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 text-center">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
