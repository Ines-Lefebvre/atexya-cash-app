import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await backend.admin.login(credentials);
      if (response.success) {
        navigate('/admin/dashboard');
      }
    } catch (error: any) {
      console.error('Erreur authentification:', error);
      toast({
        title: "Accès refusé",
        description: "Identifiants incorrects ou erreur serveur.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-opensans">
      <Card className="w-full max-w-md bg-white shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle 
            className="text-3xl text-center text-[#0f2f47]"
            style={{ fontFamily: 'Astaneh Bold, sans-serif' }}
          >
            Administration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-semibold text-[#0f2f47]">Nom d'utilisateur</Label>
              <Input
                id="username"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-[#0f2f47]">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0f2f47] text-white hover:bg-[#c19a5f] py-3 text-lg"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
