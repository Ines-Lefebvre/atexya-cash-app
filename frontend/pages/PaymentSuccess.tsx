import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Download, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import backend from '~backend/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setPaymentStatus('error');
        return;
      }

      try {
        const response = await backend.atexya.verifySession({ session_id: sessionId });
        setPaymentDetails(response);
        
        if (response.payment_status === 'paid') {
          setPaymentStatus('success');
        } else {
          setPaymentStatus('error');
        }
      } catch (error) {
        console.error('Erreur vérification paiement:', error);
        setPaymentStatus('error');
      }
    };

    verifyPayment();
  }, [sessionId]);

  const handleDownloadInvoice = () => {
    if (paymentDetails?.invoice_url) {
      window.open(paymentDetails.invoice_url, '_blank');
    }
  };

  const formatCurrency = (amountCents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amountCents / 100);
  };

  const renderContent = () => {
    if (paymentStatus === 'loading') {
      return (
        <>
          <Loader2 className="w-16 h-16 mx-auto text-[#c19a5f] animate-spin" />
          <h1 className="text-4xl font-astaneh text-[#0f2f47] mt-6">
            Vérification du paiement...
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Veuillez patienter pendant que nous confirmons votre paiement.
          </p>
        </>
      );
    }

    if (paymentStatus === 'error') {
      return (
        <>
          <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
          <h1 className="text-4xl font-astaneh text-[#0f2f47] mt-6">
            Problème de paiement
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Il y a eu un problème avec votre paiement. Veuillez contacter notre support.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Link to="/page6">
              <Button className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-6 py-3 text-lg">
                Retenter le paiement
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
          Paiement réussi !
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Merci pour votre confiance. Votre contrat d'assurance est maintenant actif.
        </p>

        {paymentDetails && (
          <Card className="border-green-500 bg-green-50 my-8 text-left">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-green-800 mb-4 font-astaneh">
                Détails de votre commande
              </h3>
              <div className="space-y-2 text-sm text-green-700">
                {paymentDetails.customer_email && (
                  <p><strong>Email :</strong> {paymentDetails.customer_email}</p>
                )}
                {paymentDetails.amount_total && (
                  <p><strong>Montant :</strong> {formatCurrency(paymentDetails.amount_total)}</p>
                )}
                {paymentDetails.metadata?.siren && (
                  <p><strong>SIREN :</strong> {paymentDetails.metadata.siren}</p>
                )}
                {paymentDetails.metadata?.type && (
                  <p><strong>Type de garantie :</strong> {paymentDetails.metadata.type}</p>
                )}
                {paymentDetails.metadata?.garantie && (
                  <p><strong>Montant de garantie :</strong> {parseInt(paymentDetails.metadata.garantie).toLocaleString()}€</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          {paymentDetails?.invoice_url && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleDownloadInvoice}>
              <CardContent className="p-6 text-center">
                <Download className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
                <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                  Télécharger la facture
                </h3>
                <p className="text-gray-600 text-sm">
                  Accédez à votre facture officielle
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6 text-center">
              <Mail className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                Confirmation par email
              </h3>
              <p className="text-gray-600 text-sm">
                Vous recevrez un email avec tous les détails
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Link to="/">
            <Button className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <Card className="w-full max-w-3xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 text-center">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
