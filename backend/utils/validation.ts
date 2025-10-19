/**
 * Validation utilities for French business identifiers (SIREN, SIRET, Code APE)
 * and general input sanitization.
 */

/**
 * Vérifie si une chaîne SIREN a un format valide (exactement 9 chiffres).
 * 
 * @param siren - La chaîne SIREN à valider
 * @returns true si le format est valide, false sinon
 * 
 * @example
 * isValidSIRENFormat("123456789") // true
 * isValidSIRENFormat("12345678")  // false (8 chiffres)
 * isValidSIRENFormat("12345678A") // false (contient une lettre)
 */
export function isValidSIRENFormat(siren: string): boolean {
  if (!siren || typeof siren !== 'string') {
    return false;
  }

  const sirenRegex = /^[0-9]{9}$/;
  return sirenRegex.test(siren);
}

/**
 * Vérifie si une chaîne SIRET a un format valide (exactement 14 chiffres).
 * 
 * @param siret - La chaîne SIRET à valider
 * @returns true si le format est valide, false sinon
 * 
 * @example
 * isValidSIRETFormat("12345678901234") // true
 * isValidSIRETFormat("123456789012")   // false (12 chiffres)
 * isValidSIRETFormat("1234567890123A") // false (contient une lettre)
 */
export function isValidSIRETFormat(siret: string): boolean {
  if (!siret || typeof siret !== 'string') {
    return false;
  }

  const siretRegex = /^[0-9]{14}$/;
  return siretRegex.test(siret);
}

/**
 * Nettoie et formate une chaîne SIREN en supprimant les espaces, tirets et points.
 * 
 * @param siren - La chaîne SIREN à formater
 * @returns Le SIREN nettoyé (9 chiffres uniquement)
 * @throws Error si le SIREN ne contient pas exactement 9 chiffres après nettoyage
 * 
 * @example
 * formatSIREN("123 456 789")   // "123456789"
 * formatSIREN("123-456-789")   // "123456789"
 * formatSIREN("123.456.789")   // "123456789"
 * formatSIREN("12345678")      // Error: Le SIREN doit contenir exactement 9 chiffres
 */
export function formatSIREN(siren: string): string {
  if (!siren || typeof siren !== 'string') {
    throw new Error('Le SIREN doit être une chaîne de caractères non vide');
  }

  const cleaned = siren.replace(/[\s\-\.]/g, '');

  if (!/^[0-9]+$/.test(cleaned)) {
    throw new Error('Le SIREN ne doit contenir que des chiffres');
  }

  if (cleaned.length !== 9) {
    throw new Error(`Le SIREN doit contenir exactement 9 chiffres (reçu: ${cleaned.length})`);
  }

  return cleaned;
}

/**
 * Nettoie et formate une chaîne SIRET en supprimant les espaces, tirets et points.
 * 
 * @param siret - La chaîne SIRET à formater
 * @returns Le SIRET nettoyé (14 chiffres uniquement)
 * @throws Error si le SIRET ne contient pas exactement 14 chiffres après nettoyage
 * 
 * @example
 * formatSIRET("123 456 789 01234")   // "12345678901234"
 * formatSIRET("123-456-789-01234")   // "12345678901234"
 * formatSIRET("123.456.789.01234")   // "12345678901234"
 * formatSIRET("123456789012")        // Error: Le SIRET doit contenir exactement 14 chiffres
 */
export function formatSIRET(siret: string): string {
  if (!siret || typeof siret !== 'string') {
    throw new Error('Le SIRET doit être une chaîne de caractères non vide');
  }

  const cleaned = siret.replace(/[\s\-\.]/g, '');

  if (!/^[0-9]+$/.test(cleaned)) {
    throw new Error('Le SIRET ne doit contenir que des chiffres');
  }

  if (cleaned.length !== 14) {
    throw new Error(`Le SIRET doit contenir exactement 14 chiffres (reçu: ${cleaned.length})`);
  }

  return cleaned;
}

/**
 * Extrait le SIREN (9 premiers chiffres) d'un SIRET.
 * 
 * @param siret - La chaîne SIRET (peut contenir des espaces, tirets, points)
 * @returns Le SIREN extrait (9 chiffres)
 * @throws Error si le SIRET est invalide
 * 
 * @example
 * siretToSiren("12345678901234")       // "123456789"
 * siretToSiren("123 456 789 01234")    // "123456789"
 * siretToSiren("123-456-789-01234")    // "123456789"
 */
export function siretToSiren(siret: string): string {
  const formattedSiret = formatSIRET(siret);
  return formattedSiret.substring(0, 9);
}

/**
 * Vérifie si un code APE (Activité Principale Exercée) a un format valide.
 * Format attendu: 4 chiffres suivis d'une lettre majuscule (ex: "4120A", "6201Z").
 * 
 * @param codeAPE - Le code APE à valider
 * @returns true si le format est valide, false sinon
 * 
 * @example
 * isValidCodeAPE("4120A") // true
 * isValidCodeAPE("6201Z") // true
 * isValidCodeAPE("4120")  // false (manque la lettre)
 * isValidCodeAPE("4120a") // false (lettre minuscule)
 * isValidCodeAPE("412AB") // false (2 lettres)
 */
export function isValidCodeAPE(codeAPE: string): boolean {
  if (!codeAPE || typeof codeAPE !== 'string') {
    return false;
  }

  const codeAPERegex = /^[0-9]{4}[A-Z]$/;
  return codeAPERegex.test(codeAPE);
}

/**
 * Nettoie et sécurise une chaîne de caractères en supprimant les caractères dangereux
 * et en limitant sa longueur.
 * 
 * @param input - La chaîne à nettoyer
 * @param maxLength - La longueur maximale autorisée
 * @returns La chaîne nettoyée et tronquée
 * @throws Error si input n'est pas une chaîne ou si maxLength est invalide
 * 
 * @example
 * sanitizeString("  Hello World  ", 20)           // "Hello World"
 * sanitizeString("<script>alert('xss')</script>", 50) // "scriptalert('xss')/script"
 * sanitizeString("Société d'assurance", 10)       // "Société da"
 */
export function sanitizeString(input: string, maxLength: number): string {
  if (typeof input !== 'string') {
    throw new Error('L\'entrée doit être une chaîne de caractères');
  }

  if (typeof maxLength !== 'number' || maxLength <= 0 || !Number.isInteger(maxLength)) {
    throw new Error('La longueur maximale doit être un entier positif');
  }

  let sanitized = input.trim();

  sanitized = sanitized.replace(/[<>&"']/g, '');

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Vérifie si un SIREN est valide selon l'algorithme de Luhn.
 * L'algorithme de Luhn est utilisé pour valider les numéros SIREN en France.
 * 
 * @param siren - Le SIREN à valider (9 chiffres)
 * @returns true si le SIREN est valide selon l'algorithme de Luhn, false sinon
 * 
 * @example
 * isValidSIRENLuhn("732829320") // true (SIREN de Google France)
 * isValidSIRENLuhn("123456789") // false (checksum invalide)
 */
export function isValidSIRENLuhn(siren: string): boolean {
  if (!isValidSIRENFormat(siren)) {
    return false;
  }

  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(siren[i], 10);
    
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
  }

  return sum % 10 === 0;
}

/**
 * Vérifie si un SIRET est valide selon l'algorithme de Luhn.
 * L'algorithme de Luhn est utilisé pour valider les numéros SIRET en France.
 * 
 * @param siret - Le SIRET à valider (14 chiffres)
 * @returns true si le SIRET est valide selon l'algorithme de Luhn, false sinon
 * 
 * @example
 * isValidSIRETLuhn("73282932000074") // true (SIRET de Google France)
 * isValidSIRETLuhn("12345678901234") // false (checksum invalide)
 */
export function isValidSIRETLuhn(siret: string): boolean {
  if (!isValidSIRETFormat(siret)) {
    return false;
  }

  let sum = 0;
  
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(siret[i], 10);
    
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
  }

  return sum % 10 === 0;
}
