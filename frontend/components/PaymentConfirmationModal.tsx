import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paymentType: 'annual' | 'monthly';
  productType: 'standard' | 'premium';
  amount: number;
  companyName: string;
  garantieAmount: number;
}

export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  paymentType,
  productType,
  amount,
  companyName,
  garantieAmount
}: Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getGarantiePremium = () => {
    return productType === 'premium' ? garantieAmount * 1.20 : garantieAmount;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-[#0f2f47] max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Astaneh Bold, sans-serif' }} className="text-2xl text-[#0f2f47]">
            Confirmation de souscription
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">Récapitulatif</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p><strong>Entreprise :</strong> {companyName}</p>
              <p><strong>Offre :</strong> {productType === 'premium' ? 'Premium' : 'Standard'} 
                {productType === 'premium' && <Badge className="ml-2 bg-[#c19a5f]">+20% garantie</Badge>}
              </p>
              <p><strong>Garantie :</strong> {formatCurrency(getGarantiePremium())}</p>
              <p><strong>Paiement :</strong> {paymentType === 'monthly' ? 'Mensuel' : 'Annuel'}</p>
            </div>
          </div>

          <div className="border-l-4 border-[#c19a5f] pl-4">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="w-5 h-5 text-[#c19a5f]" />
              <span className="font-bold">Montant à payer</span>
            </div>
            <div className="text-2xl font-bold text-[#c19a5f]">
              {formatCurrency(amount)}
              <span className="text-sm font-normal text-gray-600">
                {paymentType === 'monthly' ? ' /mois' : ' /an'}
              </span>
            </div>
            {paymentType === 'monthly' && (
              <p className="text-sm text-gray-600 mt-1">
                Renouvellement automatique mensuel
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4" />
              <span>
                {paymentType === 'monthly' 
                  ? 'Prélèvement automatique chaque mois' 
                  : 'Paiement unique pour un an'
                }
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <Shield className="w-4 h-4" />
              <span>Paiement 100% sécurisé par Stripe</span>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Important :</strong> En confirmant, vous serez redirigé vers la page de paiement sécurisée. 
              Votre contrat sera activé immédiatement après validation du paiement.
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-[#0f2f47] text-white hover:bg-[#c19a5f]"
            >
              Confirmer et payer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
