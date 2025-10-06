import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Eye, RefreshCw, LogOut } from 'lucide-react';
import backend from '~backend/client';
import PricingDebug from './PricingDebug';

interface PromoConfig {
  active: boolean;
  discount_percent: number;
  expires: string;
  label: string;
}

interface PricingConfig {
  pivot_headcount: number;
  slope: number;
  min_ttc_standard: Record<number, number>;
  min_ttc_premium: Record<number, number> | null;
}

interface CgvConfig {
  version: string;
}

// Helper to convert file to base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // The result looks like "data:application/pdf;base64,JVBERi0xLjQKJ..."
      // We only need the base64 part.
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // States for each config type
  const [promoConfig, setPromoConfig] = useState<PromoConfig | null>(null);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [cgvConfig, setCgvConfig] = useState<CgvConfig | null>(null);
  const [cgvFile, setCgvFile] = useState<File | null>(null);

  // States for contracts
  const [contracts, setContracts] = useState<any[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  // Use default backend client - authentication is handled via cookies
  const adminBackend = backend;

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        setIsLoading(true);
        const [promo, pricing, cgv] = await Promise.all([
          adminBackend.admin.getPromo(),
          adminBackend.admin.getPricing(),
          adminBackend.admin.getCgv(),
        ]);
        setPromoConfig(promo);
        setPricingConfig(pricing);
        setCgvConfig(cgv);
      } catch (error: any) {
        console.error('Erreur chargement configs:', error);
        if (error.message && error.message.includes('unauthenticated')) {
          toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter.",
            variant: "destructive",
          });
          navigate('/admin');
        } else {
          toast({
            title: "Erreur de chargement",
            description: "Impossible de charger les configurations. Veuillez vous reconnecter.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfigs();
  }, [toast, navigate, adminBackend]);

  const fetchContracts = async () => {
    try {
      setContractsLoading(true);
      const response = await backend.atexya.listContracts({ limit: 50 });
      setContracts(response.contracts);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les contrats.",
        variant: "destructive",
      });
    } finally {
      setContractsLoading(false);
    }
  };

  const handleSave = async (saver: () => Promise<any>, name: string) => {
    try {
      await saver();
      toast({
        title: `${name} sauvegardé`,
        description: `La configuration pour ${name} a été mise à jour avec succès.`,
      });
    } catch (error: any) {
      console.error(`Erreur sauvegarde ${name}:`, error);
      if (error.message && error.message.includes('unauthenticated')) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter pour sauvegarder.",
          variant: "destructive",
        });
        navigate('/admin');
      } else {
        toast({
          title: `Erreur de sauvegarde ${name}`,
          description: "Une erreur est survenue. Vérifiez votre session et réessayez.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCgvUpload = async () => {
    if (!cgvFile) return;
    try {
      const base64File = await fileToBase64(cgvFile);
      await handleSave(() => adminBackend.admin.uploadCgvPdf({ file: base64File }), "Fichier CGV");
    } catch (error) {
      toast({
        title: "Erreur upload",
        description: "Impossible d'uploader le fichier CGV.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await adminBackend.admin.logout();
      navigate('/admin');
    } catch (error) {
      // Même en cas d'erreur, on redirige vers la page de login
      navigate('/admin');
    }
  };

  const formatCurrency = (amountCents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amountCents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'succeeded':
        return <Badge className="bg-green-500">Payé</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Échoué</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-500">Remboursé</Badge>;
      case 'disputed':
        return <Badge className="bg-red-700">Contesté</Badge>;
      default:
        return <Badge className="bg-gray-400">{status}</Badge>;
    }
  };

  if (isLoading || !promoConfig || !pricingConfig || !cgvConfig) {
    return <div className="text-center py-10">Chargement du panneau d'administration...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <h1 
              className="text-3xl font-bold text-[#0f2f47] mb-4"
              style={{ fontFamily: 'Astaneh Bold, sans-serif' }}
            >
              Administration Atexya Cash
            </h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>

        <Tabs defaultValue="promotion" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="promotion">Promotion</TabsTrigger>
            <TabsTrigger value="liens">Liens</TabsTrigger>
            <TabsTrigger value="courtiers">Courtiers</TabsTrigger>
            <TabsTrigger value="cgv">CGV</TabsTrigger>
            <TabsTrigger value="tarification">Tarification</TabsTrigger>
            <TabsTrigger value="contrats">Contrats</TabsTrigger>
            <TabsTrigger value="debug">Debug Tarifs</TabsTrigger>
          </TabsList>

          <TabsContent value="promotion">
            <Card>
              <CardHeader><CardTitle>Configuration Promotionnelle</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={promoConfig.active} 
                    onCheckedChange={(c) => {
                      const newConfig = { ...promoConfig, active: c };
                      setPromoConfig(newConfig);
                      // Sauvegarde automatique quand on change l'état actif
                      handleSave(() => adminBackend.admin.updatePromo(newConfig), "Promotion");
                    }} 
                  />
                  <Label>Promotion active</Label>
                  {promoConfig.active && (
                    <Badge className="bg-green-500 text-white">ACTIF</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount">Pourcentage de réduction (%)</Label>
                    <Input 
                      id="discount" 
                      type="number" 
                      value={promoConfig.discount_percent} 
                      onChange={(e) => setPromoConfig({ ...promoConfig, discount_percent: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="expires">Date d'expiration</Label>
                    <Input 
                      id="expires" 
                      type="date" 
                      value={promoConfig.expires} 
                      onChange={(e) => setPromoConfig({ ...promoConfig, expires: e.target.value })} 
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="label">Libellé promotion</Label>
                  <Input 
                    id="label" 
                    value={promoConfig.label} 
                    onChange={(e) => setPromoConfig({ ...promoConfig, label: e.target.value })} 
                  />
                </div>
                <Button 
                  onClick={() => handleSave(() => adminBackend.admin.updatePromo(promoConfig), "Promotion")} 
                  className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]"
                >
                  Sauvegarder
                </Button>
                
                {/* Aperçu de l'état actuel */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">État actuel de la promotion :</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Statut :</strong> {promoConfig.active ? '✅ Active' : '❌ Inactive'}</p>
                    <p><strong>Réduction :</strong> {promoConfig.discount_percent}%</p>
                    <p><strong>Expire le :</strong> {promoConfig.expires || 'Non défini'}</p>
                    <p><strong>Libellé :</strong> {promoConfig.label || 'Aucun'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liens"><Card><CardHeader><CardTitle>Liens</CardTitle></CardHeader><CardContent>À implémenter.</CardContent></Card></TabsContent>
          <TabsContent value="courtiers"><Card><CardHeader><CardTitle>Courtiers</CardTitle></CardHeader><CardContent>À implémenter.</CardContent></Card></TabsContent>

          <TabsContent value="cgv">
            <Card>
              <CardHeader><CardTitle>Conditions Générales de Vente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cgv-version">Version CGV (ex: 2025-01)</Label>
                  <Input 
                    id="cgv-version" 
                    value={cgvConfig.version} 
                    onChange={(e) => setCgvConfig({ ...cgvConfig, version: e.target.value })} 
                  />
                </div>
                <Button 
                  onClick={() => handleSave(() => adminBackend.admin.updateCgv(cgvConfig), "Version CGV")} 
                  className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]"
                >
                  Sauvegarder Version
                </Button>
                <div className="pt-4 border-t">
                  <Label>Upload nouveau PDF (/docs/cgv.pdf)</Label>
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setCgvFile(e.target.files ? e.target.files[0] : null)} 
                  />
                </div>
                <Button 
                  onClick={handleCgvUpload} 
                  disabled={!cgvFile} 
                  className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]"
                >
                  Uploader Fichier
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tarification">
            <Card>
              <CardHeader><CardTitle>Configuration Tarifaire</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pivot">Pivot effectif</Label>
                    <Input 
                      id="pivot" 
                      type="number" 
                      value={pricingConfig.pivot_headcount} 
                      onChange={(e) => setPricingConfig({ ...pricingConfig, pivot_headcount: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="slope">Coefficient pente</Label>
                    <Input 
                      id="slope" 
                      type="number" 
                      step="0.1" 
                      value={pricingConfig.slope} 
                      onChange={(e) => setPricingConfig({ ...pricingConfig, slope: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                </div>
                <div>
                  <Label>Planchers TTC Standard (JSON)</Label>
                  <Textarea 
                    value={JSON.stringify(pricingConfig.min_ttc_standard, null, 2)} 
                    onChange={(e) => { 
                      try { 
                        setPricingConfig({ ...pricingConfig, min_ttc_standard: JSON.parse(e.target.value) }); 
                      } catch {} 
                    }} 
                    rows={8} 
                    className="font-mono text-sm" 
                  />
                </div>
                <Button 
                  onClick={() => handleSave(() => adminBackend.admin.updatePricing(pricingConfig), "Tarification")} 
                  className="bg-[#0f2f47] text-white hover:bg-[#c19a5f]"
                >
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contrats">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Gestion des Contrats</CardTitle>
                  <Button onClick={fetchContracts} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <div className="text-center py-8">Chargement des contrats...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Contrat</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Entreprise</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              Aucun contrat trouvé. <Button variant="link" onClick={fetchContracts}>Charger les contrats</Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          contracts.map((contract) => (
                            <TableRow key={contract.id}>
                              <TableCell className="font-mono text-xs">{contract.id.substring(0, 12)}...</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{contract.customer_name}</div>
                                  <div className="text-xs text-gray-500">{contract.customer_email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{contract.company_name}</div>
                                  <div className="text-xs text-gray-500">SIREN: {contract.siren}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={contract.contract_type === 'premium' ? 'default' : 'secondary'}>
                                  {contract.contract_type}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatCurrency(contract.premium_ttc)}</TableCell>
                              <TableCell>{getStatusBadge(contract.payment_status)}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(contract.created_at).toLocaleDateString('fr-FR')}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debug">
            <Card>
              <CardHeader>
                <CardTitle>Debug Calcul Tarification</CardTitle>
              </CardHeader>
              <CardContent>
                <PricingDebug />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
