import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, FileText, Mail, Download, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import backend from '~backend/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [contractDetails, setContractDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setStatus('error');
        return;
      }

      try {
        // Récupérer les détails de la session Stripe
        const sessionResponse = await backend.stripe.getSession({ sessionId });
        setSessionDetails(sessionResponse);

        // Récupérer les détails du contrat si disponible
        if (sessionResponse.metadata?.contract_id) {
          try {
            const contractResponse = await backend.atexya.getContract({ 
              contract_id: sessionResponse.metadata.contract_id 
            });
            setContractDetails(contractResponse);
          } catch (contractError) {
            console.warn('Contract not found, but payment session is valid:', contractError);
          }
        }

        if (sessionResponse.status === 'complete' && sessionResponse.paymentStatus === 'paid') {
          setStatus('success');
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

  const getPaymentTypeLabel = (type: string) => {
    return type === 'monthly' ? 'Mensuel' : 'Annuel';
  };

  const getProductTypeLabel = (type: string) => {
    return type === 'premium' ? 'Premium' : 'Standard';
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

        {sessionDetails && (
          <Card className="border-green-500 bg-green-50 my-8 text-left">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-green-800 mb-4 font-astaneh">
                Détails de votre souscription
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                <div><strong>Email :</strong> {sessionDetails.customerEmail}</div>
                <div><strong>Montant payé :</strong> {formatCurrency(sessionDetails.amountTotal || 0)}</div>
                {sessionDetails.metadata && (
                  <>
                    <div><strong>Entreprise :</strong> {sessionDetails.metadata.company_name}</div>
                    <div><strong>SIREN :</strong> {sessionDetails.metadata.siren}</div>
                    <div><strong>Offre :</strong> {getProductTypeLabel(sessionDetails.metadata.product_type)}
                      {sessionDetails.metadata.product_type === 'premium' && 
                        <Badge className="ml-2 bg-[#c19a5f] text-white">+20% garantie</Badge>
                      }
                    </div>
                    <div><strong>Paiement :</strong> {getPaymentTypeLabel(sessionDetails.metadata.payment_type)}</div>
                    <div><strong>Garantie :</strong> {parseInt(sessionDetails.metadata.garantie_amount).toLocaleString()}€</div>
                    <div><strong>CTN :</strong> {sessionDetails.metadata.secteur_ctn}</div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
              {sessionDetails?.metadata?.payment_type === 'monthly' ? (
                <Calendar className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              ) : (
                <Mail className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              )}
              <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                {sessionDetails?.metadata?.payment_type === 'monthly' ? 'Renouvellement' : 'Support client'}
              </h3>
              <p className="text-gray-600 text-sm">
                {sessionDetails?.metadata?.payment_type === 'monthly' 
                  ? 'Prélèvement automatique mensuel'
                  : 'Assistance disponible 24h/24'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {sessionDetails?.metadata?.payment_type === 'monthly' && (
          <Card className="border-blue-500 bg-blue-50 my-8">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-bold text-blue-800 mb-2 font-astaneh">
                Paiement mensuel activé
              </h3>
              <div className="text-blue-700 text-sm space-y-1">
                <p>Votre abonnement mensuel a été activé avec succès</p>
                <p>Prochaine échéance : {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}</p>
                <p>Vous pouvez annuler à tout moment depuis votre espace client</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-green-500 bg-green-50 my-8">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-bold text-green-800 mb-2 font-astaneh">
              Prochaines étapes
            </h3>
            <div className="text-green-700 text-sm space-y-1">
              <p>1. Vous recevrez un email de confirmation avec votre facture</p>
              <p>2. Votre attestation d'assurance sera envoyée sous 24h</p>
              <p>3. Conservez précieusement ces documents</p>
              {sessionDetails?.metadata?.broker_code && (
                <p>4. Votre courtier sera notifié de la souscription</p>
              )}
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
