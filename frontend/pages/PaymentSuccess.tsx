import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, FileText, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import backend from '~backend/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contract_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [contractDetails, setContractDetails] = useState<any>(null);

  useEffect(() => {
    const verifyContract = async () => {
      if (!contractId) {
        setStatus('error');
        return;
      }

      try {
        const response = await backend.atexya.getContract({ contract_id: contractId });
        setContractDetails(response);
        setStatus('success');
      } catch (error) {
        console.error('Erreur récupération contrat:', error);
        setStatus('error');
      }
    };

    verifyContract();
  }, [contractId]);

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
            Vérification du contrat...
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Veuillez patienter pendant que nous vérifions votre contrat.
          </p>
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
          <h1 className="text-4xl font-astaneh text-[#0f2f47] mt-6">
            Problème avec le contrat
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Il y a eu un problème avec la création de votre contrat. Veuillez contacter notre support.
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
          Contrat créé avec succès !
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Merci pour votre confiance. Votre contrat d'assurance a été créé et sera finalisé après règlement.
        </p>

        {contractDetails && (
          <Card className="border-green-500 bg-green-50 my-8 text-left">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-green-800 mb-4 font-astaneh">
                Détails de votre contrat
              </h3>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>ID Contrat :</strong> {contractDetails.id}</p>
                <p><strong>Email :</strong> {contractDetails.customer_email}</p>
                <p><strong>Entreprise :</strong> {contractDetails.company_name}</p>
                <p><strong>SIREN :</strong> {contractDetails.siren}</p>
                <p><strong>Type :</strong> {contractDetails.contract_type}</p>
                <p><strong>Garantie :</strong> {contractDetails.garantie_amount.toLocaleString()}€</p>
                <p><strong>Prime TTC :</strong> {formatCurrency(contractDetails.premium_ttc)}</p>
                <p><strong>Statut :</strong> {contractDetails.payment_status === 'pending' ? 'En attente de paiement' : contractDetails.payment_status}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                Contrat en cours
              </h3>
              <p className="text-gray-600 text-sm">
                Votre contrat sera activé après règlement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Mail className="w-12 h-12 mx-auto text-[#c19a5f] mb-4" />
              <h3 className="text-lg font-bold text-[#0f2f47] mb-2 font-astaneh">
                Suivi par email
              </h3>
              <p className="text-gray-600 text-sm">
                Vous serez contacté pour finaliser le paiement
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-blue-500 bg-blue-50 my-8">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-bold text-blue-800 mb-2 font-astaneh">
              Prochaines étapes
            </h3>
            <div className="text-blue-700 text-sm space-y-1">
              <p>1. Vous recevrez un email de confirmation avec les détails</p>
              <p>2. Notre équipe vous contactera pour organiser le paiement</p>
              <p>3. Votre contrat sera activé dès réception du règlement</p>
            </div>
          </CardContent>
        </Card>

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
