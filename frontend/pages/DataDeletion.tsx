import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import backend from "~backend/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";

export default function DataDeletion() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const token = searchParams.get("token");
  const requestId = searchParams.get("request_id");
  const action = searchParams.get("action");

  const isConfirmation = token && requestId && !action;
  const isCancellation = token && requestId && action === "cancel";

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await backend.user.requestDeletion({ email });
      
      toast({
        title: "Demande envoyée",
        description: response.message,
      });

      setShowSuccess(true);
      setEmail("");
    } catch (error: any) {
      console.error("Error requesting deletion:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la demande de suppression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!token || !requestId) return;

    setLoading(true);

    try {
      const response = await backend.user.confirmDeletion({
        request_id: requestId,
        token,
      });

      toast({
        title: "Données supprimées",
        description: response.message,
      });

      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error: any) {
      console.error("Error confirming deletion:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de confirmer la suppression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!token || !requestId) return;

    setLoading(true);

    try {
      const response = await backend.user.cancelDeletion({
        request_id: requestId,
        token,
      });

      toast({
        title: "Demande annulée",
        description: response.message,
      });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      console.error("Error cancelling deletion:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'annuler la demande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <CardTitle>Confirmer la suppression de vos données</CardTitle>
            </div>
            <CardDescription>
              Cette action est irréversible et supprimera définitivement toutes vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Attention</AlertTitle>
              <AlertDescription>
                En confirmant, les données suivantes seront définitivement supprimées :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Tous vos contrats d'assurance</li>
                  <li>Vos informations de paiement</li>
                  <li>Votre historique de sessions</li>
                  <li>Toutes vos données personnelles</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Vos droits RGPD</h3>
              <p className="text-sm text-muted-foreground">
                Conformément à l'article 17 du RGPD, vous avez le droit d'obtenir 
                l'effacement de vos données personnelles. Cette suppression est 
                définitive et ne peut pas être annulée après confirmation.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleConfirmDeletion}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suppression en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Confirmer la suppression
                  </>
                )}
              </Button>
              <Button
                onClick={() => navigate("/")}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Vous avez changé d'avis ? Vous pouvez aussi{" "}
              <button
                onClick={() => navigate(`/user/delete/confirm?token=${token}&request_id=${requestId}&action=cancel`)}
                className="underline hover:text-foreground"
              >
                annuler cette demande
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCancellation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Annuler la demande de suppression</CardTitle>
            <CardDescription>
              Vous êtes sur le point d'annuler votre demande de suppression de données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si vous annulez cette demande, vos données seront conservées et 
              vous pourrez continuer à utiliser nos services normalement.
            </p>

            <div className="flex gap-4">
              <Button
                onClick={handleCancelDeletion}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Annulation...
                  </>
                ) : (
                  "Annuler la demande"
                )}
              </Button>
              <Button
                onClick={() => navigate("/")}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <CardTitle>Droit à l'effacement (RGPD)</CardTitle>
          </div>
          <CardDescription>
            Demandez la suppression de vos données personnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {showSuccess ? (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Email de confirmation envoyé</AlertTitle>
              <AlertDescription>
                Nous vous avons envoyé un email contenant un lien de confirmation. 
                Veuillez cliquer sur ce lien pour valider la suppression de vos données.
                Le lien est valide pendant 24 heures.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Vos droits RGPD</h3>
                <p className="text-sm text-muted-foreground">
                  Conformément à l'article 17 du Règlement Général sur la Protection des 
                  Données (RGPD), vous avez le droit d'obtenir l'effacement de vos 
                  données personnelles.
                </p>
                <p className="text-sm text-muted-foreground">
                  Cette action supprimera définitivement :
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Tous vos contrats d'assurance</li>
                  <li>Vos informations de paiement</li>
                  <li>Votre historique de sessions</li>
                  <li>Toutes vos données personnelles</li>
                </ul>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>
                  Cette action est irréversible. Une fois vos données supprimées, 
                  elles ne pourront pas être récupérées.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleRequestDeletion} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Adresse email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Nous vous enverrons un email de confirmation à cette adresse
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Demander la suppression de mes données
                    </>
                  )}
                </Button>
              </form>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Processus de suppression</h3>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>Remplissez le formulaire avec votre email</li>
                  <li>Recevez un email de confirmation (valable 24h)</li>
                  <li>Cliquez sur le lien pour confirmer la suppression</li>
                  <li>Vos données sont définitivement supprimées</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
