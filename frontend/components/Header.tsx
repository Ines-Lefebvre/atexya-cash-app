import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ContactModal from './ContactModal';

const navLinks = [
  { to: "/", text: "Société" },
  { to: "/page2", text: "Établissements" },
  { to: "/page3", text: "Antécédents" },
  { to: "/page4", text: "Garanties" },
  { to: "/page6", text: "Offre" },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0f2f47] text-white h-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-full">
          {/* Logo */}
          <Link to="/" className="relative flex items-center p-5 -ml-5">
            <div className="absolute inset-0 w-full h-full bg-white opacity-5 scale-105 transform -skew-x-6"></div>
            <div className="relative flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white font-astaneh">atexya</span>
              <span className="text-2xl font-bold text-[#c19a5f] font-astaneh">cash</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center space-x-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) => `
                  px-4 py-2 rounded-lg text-center text-white transition-all duration-200 font-medium
                  ${isActive 
                    ? 'bg-[#c19a5f] hover:bg-[#d4a865]' 
                    : 'bg-[#0f2f47] hover:border hover:border-[#c19a5f]'
                  }
                `}
              >
                {link.text}
              </NavLink>
            ))}
            <button 
              onClick={() => setIsContactModalOpen(true)} 
              className="px-4 py-2 rounded-lg text-center text-white transition-all duration-200 font-medium bg-[#0f2f47] hover:border hover:border-[#c19a5f]"
            >
              Contact
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Ouvrir le menu">
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#0f2f47] absolute top-20 left-0 w-full shadow-xl">
            <nav className="flex flex-col items-center space-y-2 p-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  className={({ isActive }) => `
                    w-full px-4 py-3 rounded-lg text-center text-white transition-all duration-200 font-medium
                    ${isActive 
                      ? 'bg-[#c19a5f]' 
                      : 'bg-[#0f2f47] hover:border hover:border-[#c19a5f]'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.text}
                </NavLink>
              ))}
              <button 
                onClick={() => { setIsContactModalOpen(true); setIsMobileMenuOpen(false); }} 
                className="w-full px-4 py-3 rounded-lg text-center text-white transition-all duration-200 font-medium bg-[#0f2f47] hover:border hover:border-[#c19a5f]"
              >
                Contact
              </button>
            </nav>
          </div>
        )}
      </header>
      <ContactModal isOpen={isContactModalOpen} setIsOpen={setIsContactModalOpen} />
    </>
  );
}
