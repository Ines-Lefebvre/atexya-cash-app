import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface Props {
  standardPrice: number;
  premiumPrice: number;
  promoActive: boolean;
  promoLabel?: string;
  onPaymentSelect: (paymentType: 'annual' | 'monthly', productType: 'standard' | 'premium') => void;
  isProcessing: boolean;
}

export default function PaymentOptions({ 
  standardPrice, 
  premiumPrice, 
  promoActive, 
  promoLabel,
  onPaymentSelect,
  isProcessing 
}: Props) {
  const [paymentType, setPaymentType] = useState<'annual' | 'monthly'>('annual');
  const [selectedProduct, setSelectedProduct] = useState<'standard' | 'premium'>('standard');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getMonthlyPrice = (annualPrice: number) => {
    return Math.round((annualPrice * 1.20) / 12 * 100) / 100;
  };

  const getCurrentPrice = (basePrice: number) => {
    return paymentType === 'monthly' ? getMonthlyPrice(basePrice) : basePrice;
  };

  const handleSubscribe = () => {
    onPaymentSelect(paymentType, selectedProduct);
  };

  return (
    <div className="space-y-6">
      {/* Options de paiement */}
      <Card className="border-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 font-bold font-astaneh">
            Mode de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={paymentType} 
            onValueChange={(value) => setPaymentType(value as 'annual' | 'monthly')}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="annual" id="annual" />
              <Label htmlFor="annual" className="cursor-pointer">
                <div className="font-medium">Paiement annuel</div>
                <div className="text-sm text-gray-600">En une seule fois</div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly" className="cursor-pointer">
                <div className="font-medium">Paiement mensuel</div>
                <div className="text-sm text-gray-600">+20% sur le prix total</div>
              </Label>
            </div>
          </RadioGroup>

          {paymentType === 'monthly' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Paiement mensuel</p>
                  <p>Le paiement mensuel inclut une majoration de 20% sur le prix annuel pour couvrir les frais de gestion et de fractionnement.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sélection du produit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offre Standard */}
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            selectedProduct === 'standard' 
              ? 'border-2 border-[#0f2f47] bg-blue-50' 
              : 'border-gray-200 hover:border-[#0f2f47]'
          }`}
          onClick={() => setSelectedProduct('standard')}
        >
          <CardHeader>
            <CardTitle className="text-center font-astaneh text-[#0f2f47]">
              Offre Standard
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <div className="text-2xl font-bold text-[#c19a5f]">
                {formatCurrency(getCurrentPrice(standardPrice))}
                <span className="text-sm font-normal text-gray-600">
                  {paymentType === 'monthly' ? ' /mois' : ' /an'}
                </span>
              </div>
              {paymentType === 'monthly' && (
                <div className="text-sm text-gray-600 mt-1">
                  {formatCurrency(standardPrice * 1.20)} TTC sur 12 mois
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-gray-700">
              <p>✓ Garantie responsabilité civile</p>
              <p>✓ Protection juridique incluse</p>
              <p>✓ Assistance 24h/24</p>
            </div>
          </CardContent>
        </Card>

        {/* Offre Premium */}
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            selectedProduct === 'premium' 
              ? 'border-2 border-[#c19a5f] bg-yellow-50' 
              : 'border-gray-200 hover:border-[#c19a5f]'
          }`}
          onClick={() => setSelectedProduct('premium')}
        >
          <CardHeader>
            <CardTitle className="text-center text-[#c19a5f] flex items-center justify-center gap-2 font-astaneh">
              Offre Premium
              {promoActive && (
                <Badge variant="destructive" className="text-xs">PROMO</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <div className="text-2xl font-bold text-[#c19a5f]">
                {formatCurrency(getCurrentPrice(premiumPrice))}
                <span className="text-sm font-normal text-gray-600">
                  {paymentType === 'monthly' ? ' /mois' : ' /an'}
                </span>
              </div>
              {paymentType === 'monthly' && (
                <div className="text-sm text-gray-600 mt-1">
                  {formatCurrency(premiumPrice * 1.20)} TTC sur 12 mois
                </div>
              )}
              {promoActive && promoLabel && (
                <div className="text-sm text-red-600 font-medium mt-2">
                  {promoLabel}
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-sm text-gray-700">
              <p>✓ Garantie majorée de 20%</p>
              <p>✓ Protection juridique renforcée</p>
              <p>✓ Assistance 24h/24 prioritaire</p>
              <p>✓ Expertise dédiée</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Récapitulatif */}
      <Card className="border-green-500 bg-green-50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-green-800">
                Offre sélectionnée : {selectedProduct === 'premium' ? 'Premium' : 'Standard'}
              </p>
              <p className="text-sm text-green-700">
                Paiement {paymentType === 'monthly' ? 'mensuel' : 'annuel'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(getCurrentPrice(selectedProduct === 'premium' ? premiumPrice : standardPrice))}
              </p>
              <p className="text-sm text-green-700">
                {paymentType === 'monthly' ? 'par mois' : 'pour l\'année'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bouton de souscription */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSubscribe}
          disabled={isProcessing}
          className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Redirection vers le paiement...' : 'Procéder au paiement sécurisé'}
        </Button>
      </div>

      {/* Informations sécurité */}
      <div className="text-center text-sm text-gray-600 space-y-1">
        <p>🔒 Paiement 100% sécurisé par Stripe</p>
        <p>Cartes acceptées : Visa, Mastercard, SEPA</p>
        <p>Vous serez redirigé vers la page de paiement sécurisée</p>
      </div>
    </div>
  );
}
