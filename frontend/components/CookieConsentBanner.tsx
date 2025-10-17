import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X, Cookie, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CookieConsentBannerProps {
  onAccept: (preferences: ConsentPreferences) => void;
  onDecline: () => void;
}

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsentBanner({ onAccept, onDecline }: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setIsVisible(false);
    onAccept(allAccepted);
  };

  const handleDeclineAll = () => {
    const declined: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setIsVisible(false);
    onDecline();
    localStorage.setItem("cookie_consent", JSON.stringify(declined));
    localStorage.setItem("cookie_consent_date", new Date().toISOString());
  };

  const handleSavePreferences = () => {
    setIsVisible(false);
    setShowSettings(false);
    onAccept(preferences);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        <Card className="max-w-4xl mx-auto p-6 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Cookie className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Nous utilisons des cookies</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeclineAll}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Nous utilisons des cookies pour améliorer votre expérience, analyser notre trafic
                et personnaliser le contenu. Vous pouvez choisir quels cookies vous acceptez.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAcceptAll} size="sm">
                  Tout accepter
                </Button>
                <Button onClick={handleDeclineAll} variant="outline" size="sm">
                  Tout refuser
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  size="sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Personnaliser
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Préférences de cookies</DialogTitle>
            <DialogDescription>
              Gérez vos préférences de cookies. Les cookies nécessaires sont toujours activés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex-1 space-y-1">
                <div className="font-medium">Cookies nécessaires</div>
                <p className="text-sm text-muted-foreground">
                  Ces cookies sont essentiels au fonctionnement du site. Ils permettent
                  la navigation et l'utilisation des fonctionnalités de base.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
              <div className="flex-1 space-y-1">
                <div className="font-medium">Cookies analytiques</div>
                <p className="text-sm text-muted-foreground">
                  Ces cookies nous aident à comprendre comment les visiteurs interagissent
                  avec notre site en collectant des informations de manière anonyme (Google Analytics).
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
              <div className="flex-1 space-y-1">
                <div className="font-medium">Cookies marketing</div>
                <p className="text-sm text-muted-foreground">
                  Ces cookies sont utilisés pour vous proposer des publicités pertinentes
                  et mesurer l'efficacité de nos campagnes publicitaires.
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Annuler
            </Button>
            <Button onClick={handleSavePreferences}>
              Enregistrer les préférences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
