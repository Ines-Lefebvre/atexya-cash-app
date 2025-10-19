import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export default function FicheContact() {
  const { toast } = useToast();
  const location = useLocation();
  const redirectMessage = location.state?.message;

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.prenom || !formData.email || !formData.telephone) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await backend.atexya.sendContact(formData);
      
      toast({
        title: "Demande envoyée",
        description: "Votre demande a été envoyée avec succès. Nous vous recontacterons rapidement.",
      });
      
      setFormData({ nom: '', prenom: '', email: '', telephone: '', message: '' });
      
    } catch (error) {
      console.error('Erreur envoi contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre demande. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-100 p-4 font-opensans">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-astaneh text-[#0f2f47]">
          Contactez-nous
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Votre profil nécessite une étude personnalisée. Remplissez le formulaire ci-dessous et notre équipe vous contactera rapidement.
        </p>
      </div>

      <Card className="w-full max-w-3xl bg-white shadow-lg rounded-lg">
        <CardContent className="p-8 space-y-6">
          {redirectMessage && (
            <Card className="bg-yellow-50 border-yellow-400">
              <CardContent className="p-4">
                <p className="text-yellow-800 text-center font-semibold">
                  {redirectMessage}
                </p>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nom" className="font-bold text-[#0f2f47]">Nom <span className="text-red-500">*</span></Label>
                <Input id="nom" value={formData.nom} onChange={(e) => handleInputChange('nom', e.target.value)} placeholder="Votre nom" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom" className="font-bold text-[#0f2f47]">Prénom <span className="text-red-500">*</span></Label>
                <Input id="prenom" value={formData.prenom} onChange={(e) => handleInputChange('prenom', e.target.value)} placeholder="Votre prénom" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold text-[#0f2f47]">Email <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="votre.email@exemple.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone" className="font-bold text-[#0f2f47]">Téléphone <span className="text-red-500">*</span></Label>
                <Input id="telephone" type="tel" value={formData.telephone} onChange={(e) => handleInputChange('telephone', e.target.value)} placeholder="01 23 45 67 89" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="font-bold text-[#0f2f47]">Message</Label>
              <Textarea id="message" value={formData.message} onChange={(e) => handleInputChange('message', e.target.value)} placeholder="Décrivez votre besoin ou toute information complémentaire..." rows={4} />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] px-8 py-3 text-lg"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
