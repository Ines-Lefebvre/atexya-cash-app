import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export default function PricingDebug() {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    effectif_global: 50,
    ctn: 'C',
    antecedents: { ip2: 0, ip3: 0, ip4: 0, deces: 0 },
    choix_garantie: 50000
  });
  
  const [debugResult, setDebugResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const result = await backend.atexya.debugPricing(formData);
      setDebugResult(result);
    } catch (error) {
      console.error('Erreur calcul debug:', error);
      toast({
        title: "Erreur",
        description: "Impossible de calculer le debug pricing.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAntecedent = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      antecedents: {
        ...prev.antecedents,
        [field]: parseInt(value) || 0
      }
    }));
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de calcul</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="effectif">Effectif global</Label>
              <Input
                id="effectif"
                type="number"
                value={formData.effectif_global}
                onChange={(e) => setFormData(prev => ({ ...prev, effectif_global: parseInt(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="ctn">CTN</Label>
              <Select value={formData.ctn} onValueChange={(value) => setFormData(prev => ({ ...prev, ctn: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(ctn => (
                    <SelectItem key={ctn} value={ctn}>CTN {ctn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="garantie">Garantie (€)</Label>
              <Select 
                value={String(formData.choix_garantie)} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, choix_garantie: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000].map(g => (
                    <SelectItem key={g} value={String(g)}>{g.toLocaleString()}€</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="ip2">IP2</Label>
              <Input
                id="ip2"
                type="number"
                min="0"
                value={formData.antecedents.ip2}
                onChange={(e) => updateAntecedent('ip2', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ip3">IP3</Label>
              <Input
                id="ip3"
                type="number"
                min="0"
                value={formData.antecedents.ip3}
                onChange={(e) => updateAntecedent('ip3', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ip4">IP4</Label>
              <Input
                id="ip4"
                type="number"
                min="0"
                value={formData.antecedents.ip4}
                onChange={(e) => updateAntecedent('ip4', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="deces">Décès</Label>
              <Input
                id="deces"
                type="number"
                min="0"
                value={formData.antecedents.deces}
                onChange={(e) => updateAntecedent('deces', e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleCalculate} 
            disabled={isLoading}
            className="bg-[#0f2f47] text-white hover:bg-[#c19a5f] w-full"
          >
            {isLoading ? 'Calcul en cours...' : 'Calculer et analyser'}
          </Button>
        </CardContent>
      </Card>

      {debugResult && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Résultat final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">
                    {debugResult.tarifs_finaux.standard_ttc.toFixed(2)}€
                  </div>
                  <div className="text-blue-600">Standard TTC</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">
                    {debugResult.tarifs_finaux.premium_ttc.toFixed(2)}€
                  </div>
                  <div className="text-green-600">Premium TTC</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres utilisés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><strong>Pivot effectif:</strong> {debugResult.parametres_utilises.pivot_headcount}</div>
                <div><strong>Coefficient pente:</strong> {debugResult.parametres_utilises.slope}</div>
                <div><strong>Taux CTN:</strong> {(debugResult.parametres_utilises.taux_ctn * 1000).toFixed(2)}‰</div>
                <div><strong>Taxes:</strong> {debugResult.parametres_utilises.taxes_percent}%</div>
                <div><strong>Plancher standard:</strong> {debugResult.parametres_utilises.plancher_standard}€</div>
                <div><strong>Plancher premium:</strong> {debugResult.parametres_utilises.plancher_premium}€</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détail des étapes de calcul</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étape</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Calcul</TableHead>
                    <TableHead>Résultat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debugResult.etapes.map((etape: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{etape.etape}</TableCell>
                      <TableCell>{etape.description}</TableCell>
                      <TableCell className="font-mono text-sm">{etape.calcul}</TableCell>
                      <TableCell className="font-bold">
                        {typeof etape.resultat === 'number' 
                          ? etape.resultat.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                          : etape.resultat
                        }
                        {typeof etape.resultat === 'number' && etape.etape.includes('Prime') && '€'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
