import { api } from "encore.dev/api";

interface ContactRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
}

// Envoie une demande de contact
export const sendContact = api<ContactRequest, ContactResponse>(
  { expose: true, method: "POST", path: "/contact/send" },
  async (params) => {
    // TODO: Implémenter l'envoi d'email/webhook vers contact@atexya.fr
    console.log("Contact form submitted:", params);
    
    return {
      success: true
    };
  }
);
