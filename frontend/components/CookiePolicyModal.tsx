import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CookiePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CookiePolicyModal({ open, onOpenChange }: CookiePolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Politique de cookies</DialogTitle>
          <DialogDescription>
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-2">Qu'est-ce qu'un cookie ?</h3>
              <p className="text-muted-foreground">
                Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette,
                smartphone, etc.) lors de la visite d'un site web. Il permet au site de mémoriser
                des informations sur votre visite, comme votre langue préférée et d'autres paramètres.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Comment utilisons-nous les cookies ?</h3>
              <p className="text-muted-foreground mb-4">
                Nous utilisons différents types de cookies pour améliorer votre expérience sur
                notre site :
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold mb-1">Cookies strictement nécessaires</h4>
                  <p className="text-muted-foreground">
                    Ces cookies sont essentiels pour vous permettre de naviguer sur le site et
                    d'utiliser ses fonctionnalités. Sans ces cookies, certains services ne peuvent
                    pas être fournis.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Durée de conservation : Session ou 1 an
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold mb-1">Cookies analytiques (Google Analytics)</h4>
                  <p className="text-muted-foreground">
                    Ces cookies nous permettent de mesurer et d'analyser la façon dont les
                    visiteurs utilisent notre site. Toutes les informations collectées par ces
                    cookies sont agrégées et donc anonymes.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cookies utilisés : _ga, _gid, _gat
                    <br />
                    Durée de conservation : 2 ans (_ga), 24 heures (_gid)
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold mb-1">Cookies marketing</h4>
                  <p className="text-muted-foreground">
                    Ces cookies sont utilisés pour suivre les visiteurs sur les sites web afin
                    de proposer des publicités pertinentes et attrayantes pour l'utilisateur
                    individuel.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Durée de conservation : Variable selon le fournisseur
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Gestion de vos préférences</h3>
              <p className="text-muted-foreground mb-2">
                Vous pouvez à tout moment modifier vos préférences en matière de cookies :
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Via le bandeau de consentement lors de votre première visite</li>
                <li>Via les paramètres de votre navigateur</li>
                <li>En nous contactant directement</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Configuration du navigateur</h3>
              <p className="text-muted-foreground mb-2">
                La plupart des navigateurs acceptent les cookies par défaut. Vous pouvez modifier
                les paramètres de votre navigateur pour refuser tous les cookies ou pour être
                averti lorsqu'un cookie est envoyé.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium">Liens utiles :</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Chrome : Paramètres {">"} Confidentialité et sécurité {">"} Cookies</li>
                  <li>• Firefox : Paramètres {">"} Vie privée et sécurité {">"} Cookies</li>
                  <li>• Safari : Préférences {">"} Confidentialité {">"} Cookies</li>
                  <li>• Edge : Paramètres {">"} Cookies et autorisations</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Vos droits RGPD</h3>
              <p className="text-muted-foreground mb-2">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Droit d'accès à vos données personnelles</li>
                <li>Droit de rectification de vos données</li>
                <li>Droit à l'effacement (droit à l'oubli)</li>
                <li>Droit à la limitation du traitement</li>
                <li>Droit à la portabilité des données</li>
                <li>Droit d'opposition au traitement</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Pour exercer ces droits, vous pouvez nous contacter à l'adresse suivante :
                <span className="font-medium"> contact@atexya.fr</span>
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Modifications de cette politique</h3>
              <p className="text-muted-foreground">
                Nous pouvons modifier cette politique de cookies à tout moment. Toute modification
                sera publiée sur cette page avec une date de mise à jour révisée.
              </p>
            </section>

            <section className="bg-muted p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Contact</h3>
              <p className="text-muted-foreground">
                Pour toute question concernant notre utilisation des cookies ou cette politique,
                veuillez nous contacter :
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p>Email : <span className="font-medium">contact@atexya.fr</span></p>
                <p>Téléphone : <span className="font-medium">+33 1 XX XX XX XX</span></p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
