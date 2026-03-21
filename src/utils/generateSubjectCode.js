const prisma = require("../config/prisma");

/**
 * Generates a subject code in the format: ABBR-XXX
 * Example: MATH-001, CS-002, PHYS-001
 *
 * Algorithm:
 * 1. Generate abbreviation from subject name (first letters of words, max 4-6 chars)
 * 2. Find the next available number for that abbreviation
 * 3. Return formatted code: ABBR-XXX
 *
 * @param {string} subjectName - The name of the subject
 * @returns {Promise<string>} The generated subject code
 */
const generateSubjectCode = async (subjectName) => {
  // Generate abbreviation from subject name
  const abbreviation = generateAbbreviation(subjectName);

  // Find the highest existing number for this abbreviation
  const existingCodes = await prisma.subject.findMany({
    where: {
      code: {
        startsWith: `${abbreviation}-`,
      },
    },
    select: {
      code: true,
    },
  });

  // Extract numbers and find the maximum
  let maxNumber = 0;
  existingCodes.forEach((subject) => {
    const match = subject.code.match(/-(\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  // Generate next number
  const nextNumber = maxNumber + 1;

  // Format with leading zeros (001, 002, etc.)
  const formattedNumber = nextNumber.toString().padStart(3, "0");

  return `${abbreviation}-${formattedNumber}`;
};

/**
 * Generates an abbreviation from subject name
 * Rules:
 * - Take first letter of each word (uppercase)
 * - If single word, take first 3-4 consonants and vowels
 * - Max length: 6 characters
 * - Min length: 2 characters
 *
 * Examples:
 * - "Computer Science" -> "CS"
 * - "Business Management" -> "BM"
 * - "Mathematics" -> "MATH"
 * - "English Literature" -> "ENLIT"
 * - "Physical Education" -> "PE"
 *
 * @param {string} name - The subject name
 * @returns {string} The abbreviation
 */
const generateAbbreviation = (name) => {
  // Clean and normalize the name
  const cleanName = name.trim().toUpperCase();

  // Split into words
  const words = cleanName.split(/\s+/);

  if (words.length === 1) {
    // Single word: take first 4 meaningful characters
    const word = words[0];
    if (word.length <= 4) {
      return word;
    }
    // Try to get consonants and vowels intelligently
    return word.substring(0, 4);
  } else if (words.length === 2) {
    // Two words: first letter of each word
    return words[0][0] + words[1][0];
  } else {
    // Multiple words: first letter of first 3-4 words
    const initials = words
      .slice(0, 4)
      .map((w) => w[0])
      .join("");
    return initials;
  }
};

module.exports = { generateSubjectCode, generateAbbreviation };
