import { useState } from 'react';
import LegalModal from './LegalModal';
import PrivacyModal from './PrivacyModal';

export default function Footer() {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  return (
    <>
      <footer className="bg-[#0f2f47] text-white w-full mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-10 gap-8">
            {/* Colonne 1: Logo */}
            <div className="md:col-span-3 flex justify-center items-center">
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-bold text-white font-astaneh">atexya</span>
                <span className="text-xl font-bold text-[#c19a5f] font-astaneh">cash</span>
              </div>
            </div>

            {/* Colonne 2: Liens légaux */}
            <div className="md:col-span-4 flex flex-col items-center space-y-2 text-center">
              <a href="/docs/cgv.pdf" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                CGV
              </a>
              <button onClick={() => setIsLegalModalOpen(true)} className="text-sm hover:underline" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Mentions légales
              </button>
              <button onClick={() => setIsPrivacyModalOpen(true)} className="text-sm hover:underline" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Politique de confidentialité
              </button>
            </div>

            {/* Colonne 3: Contact */}
            <div className="md:col-span-3 flex flex-col items-center md:items-end text-center md:text-right space-y-1">
              <a href="mailto:contact@atexya.fr" className="text-sm hover:text-[#c19a5f]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Email : contact@atexya.fr
              </a>
              <a href="tel:0546961158" className="text-sm hover:text-[#c19a5f]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                Téléphone : 05 46 96 11 58
              </a>
              <p className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>Numéro RCS : B 433 671 930</p>
              <p className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>Numéro ORIAS : 07001780</p>
            </div>
          </div>
          <div className="text-center text-xs text-gray-400 mt-8 pt-8 border-t border-gray-700" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            © 2025 Atexya cash. Tous droits réservés.
          </div>
        </div>
      </footer>
      <LegalModal isOpen={isLegalModalOpen} setIsOpen={setIsLegalModalOpen} />
      <PrivacyModal isOpen={isPrivacyModalOpen} setIsOpen={setIsPrivacyModalOpen} />
    </>
  );
}
