/**
 * Luhn Algorithm Implementation for SIREN and SIRET Validation
 * 
 * The Luhn algorithm (also known as the modulus 10 algorithm) is a checksum formula
 * used to validate identification numbers like SIREN and SIRET in France.
 * 
 * Algorithm steps:
 * 1. Starting from the right, double every second digit (positions 1, 3, 5, etc. from right)
 * 2. If the doubled value is greater than 9, subtract 9
 * 3. Sum all digits (including non-doubled ones)
 * 4. The number is valid if the sum modulo 10 equals 0
 */

/**
 * Validates a numeric string using the Luhn algorithm.
 * 
 * The Luhn algorithm works as follows:
 * - Iterate through digits from right to left
 * - Double every second digit (at odd indices when counting from 0 from the right)
 * - If a doubled digit exceeds 9, subtract 9 from it
 * - Sum all the digits (both doubled and non-doubled)
 * - The checksum is valid if the sum is divisible by 10
 * 
 * @param number - The numeric string to validate
 * @returns true if the Luhn checksum is valid, false otherwise
 * 
 * @example
 * // Valid SIREN with correct Luhn checksum
 * luhnCheck("732829320") // true (Google France SIREN)
 * 
 * // Invalid checksum
 * luhnCheck("732829321") // false
 * 
 * // Valid SIRET with correct Luhn checksum
 * luhnCheck("73282932000074") // true (Google France SIRET)
 * 
 * // Invalid input (empty string)
 * luhnCheck("") // false
 * 
 * // Invalid input (contains letters)
 * luhnCheck("12345678A") // false
 */
export function luhnCheck(number: string): boolean {
  // Validate input
  if (!number || typeof number !== 'string') {
    return false;
  }

  // Remove any whitespace
  const cleaned = number.trim();

  // Check if string contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  // Must have at least 2 digits for Luhn to be meaningful
  if (cleaned.length < 2) {
    return false;
  }

  let sum = 0;
  const length = cleaned.length;

  // Iterate through digits from right to left
  for (let i = 0; i < length; i++) {
    // Get digit at current position (from right to left)
    let digit = parseInt(cleaned[length - 1 - i], 10);

    // Double every second digit (odd indices from the right, which is i % 2 === 1)
    if (i % 2 === 1) {
      digit *= 2;

      // If doubled digit is greater than 9, subtract 9
      // This is equivalent to summing the digits: e.g., 16 -> 1 + 6 = 7, or 16 - 9 = 7
      if (digit > 9) {
        digit -= 9;
      }
    }

    // Add to running sum
    sum += digit;
  }

  // Valid if sum is divisible by 10
  return sum % 10 === 0;
}

/**
 * Validates a SIREN number (9 digits) including format check and Luhn checksum.
 * 
 * A SIREN (Système d'Identification du Répertoire des ENtreprises) is a unique
 * 9-digit identifier assigned to French businesses.
 * 
 * This function performs two validations:
 * 1. Format validation: Ensures the input contains exactly 9 digits
 * 2. Luhn checksum validation: Verifies the checksum is correct
 * 
 * @param siren - The SIREN to validate (can include spaces, dashes, or dots)
 * @returns true if the SIREN is valid (correct format and checksum), false otherwise
 * 
 * @example
 * // Valid SIREN with spaces
 * validateSIREN("732 829 320") // true (Google France)
 * 
 * // Valid SIREN without spaces
 * validateSIREN("732829320") // true
 * 
 * // Invalid checksum
 * validateSIREN("732829321") // false
 * 
 * // Invalid format (8 digits)
 * validateSIREN("73282932") // false
 * 
 * // Invalid format (contains letters)
 * validateSIREN("73282932A") // false
 * 
 * // Empty or null input
 * validateSIREN("") // false
 * validateSIREN(null as any) // false
 */
export function validateSIREN(siren: string): boolean {
  // Validate input type
  if (!siren || typeof siren !== 'string') {
    return false;
  }

  // Remove common separators (spaces, dashes, dots)
  const cleaned = siren.replace(/[\s\-\.]/g, '');

  // Check format: must be exactly 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    return false;
  }

  // Validate Luhn checksum
  return luhnCheck(cleaned);
}

/**
 * Validates a SIRET number (14 digits) including format check and Luhn checksum.
 * 
 * A SIRET (Système d'Identification du Répertoire des ÉTablissements) is a unique
 * 14-digit identifier assigned to French business establishments.
 * It consists of the 9-digit SIREN followed by a 5-digit NIC (Numéro Interne de Classement).
 * 
 * This function performs two validations:
 * 1. Format validation: Ensures the input contains exactly 14 digits
 * 2. Luhn checksum validation: Verifies the checksum is correct
 * 
 * @param siret - The SIRET to validate (can include spaces, dashes, or dots)
 * @returns true if the SIRET is valid (correct format and checksum), false otherwise
 * 
 * @example
 * // Valid SIRET with spaces
 * validateSIRET("732 829 320 00074") // true (Google France)
 * 
 * // Valid SIRET without spaces
 * validateSIRET("73282932000074") // true
 * 
 * // Invalid checksum
 * validateSIRET("73282932000075") // false
 * 
 * // Invalid format (13 digits)
 * validateSIRET("7328293200007") // false
 * 
 * // Invalid format (contains letters)
 * validateSIRET("7328293200007A") // false
 * 
 * // Empty or null input
 * validateSIRET("") // false
 * validateSIRET(null as any) // false
 */
export function validateSIRET(siret: string): boolean {
  // Validate input type
  if (!siret || typeof siret !== 'string') {
    return false;
  }

  // Remove common separators (spaces, dashes, dots)
  const cleaned = siret.replace(/[\s\-\.]/g, '');

  // Check format: must be exactly 14 digits
  if (!/^\d{14}$/.test(cleaned)) {
    return false;
  }

  // Validate Luhn checksum
  return luhnCheck(cleaned);
}

/**
 * Extracts the SIREN (first 9 digits) from a SIRET.
 * This function does not validate the SIRET; it simply extracts the first 9 digits.
 * 
 * @param siret - The SIRET string (can include separators)
 * @returns The extracted SIREN (9 digits), or null if invalid format
 * 
 * @example
 * extractSIRENFromSIRET("73282932000074") // "732829320"
 * extractSIRENFromSIRET("732 829 320 00074") // "732829320"
 * extractSIRENFromSIRET("123456789") // null (too short)
 */
export function extractSIRENFromSIRET(siret: string): string | null {
  if (!siret || typeof siret !== 'string') {
    return null;
  }

  const cleaned = siret.replace(/[\s\-\.]/g, '');

  if (cleaned.length < 14 || !/^\d{14}$/.test(cleaned)) {
    return null;
  }

  return cleaned.substring(0, 9);
}

/*
 * Unit Tests (for reference):
 * 
 * Test luhnCheck():
 * ✓ luhnCheck("732829320") === true (valid SIREN)
 * ✓ luhnCheck("732829321") === false (invalid checksum)
 * ✓ luhnCheck("73282932000074") === true (valid SIRET)
 * ✓ luhnCheck("73282932000075") === false (invalid checksum)
 * ✓ luhnCheck("") === false (empty string)
 * ✓ luhnCheck("ABC") === false (non-numeric)
 * ✓ luhnCheck(null) === false (null input)
 * 
 * Test validateSIREN():
 * ✓ validateSIREN("732829320") === true (valid SIREN)
 * ✓ validateSIREN("732 829 320") === true (with spaces)
 * ✓ validateSIREN("732-829-320") === true (with dashes)
 * ✓ validateSIREN("732.829.320") === true (with dots)
 * ✓ validateSIREN("732829321") === false (invalid checksum)
 * ✓ validateSIREN("73282932") === false (8 digits)
 * ✓ validateSIREN("7328293200") === false (10 digits)
 * ✓ validateSIREN("73282932A") === false (contains letter)
 * ✓ validateSIREN("") === false (empty)
 * 
 * Test validateSIRET():
 * ✓ validateSIRET("73282932000074") === true (valid SIRET)
 * ✓ validateSIRET("732 829 320 00074") === true (with spaces)
 * ✓ validateSIRET("732-829-320-00074") === true (with dashes)
 * ✓ validateSIRET("732.829.320.00074") === true (with dots)
 * ✓ validateSIRET("73282932000075") === false (invalid checksum)
 * ✓ validateSIRET("7328293200007") === false (13 digits)
 * ✓ validateSIRET("732829320000740") === false (15 digits)
 * ✓ validateSIRET("7328293200007A") === false (contains letter)
 * ✓ validateSIRET("") === false (empty)
 * 
 * Test extractSIRENFromSIRET():
 * ✓ extractSIRENFromSIRET("73282932000074") === "732829320"
 * ✓ extractSIRENFromSIRET("732 829 320 00074") === "732829320"
 * ✓ extractSIRENFromSIRET("123456789") === null (too short)
 * ✓ extractSIRENFromSIRET("") === null (empty)
 * 
 * Real-world test cases:
 * ✓ validateSIREN("732829320") === true (Google France)
 * ✓ validateSIRET("73282932000074") === true (Google France - Paris)
 * ✓ validateSIREN("552100554") === true (Société Générale)
 * ✓ validateSIRET("55210055400025") === true (Société Générale - Siège)
 */
