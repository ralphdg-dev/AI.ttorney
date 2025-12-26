import lawyersList from '../data/lawyers_list.json';

interface LawyerRecord {
  Lastname: string;
  Firstname: string;
  "Middle Name": string;
  Address: string;
  "Roll Signed Date": string;
  "Roll No.": string;
}

export interface ValidationResult {
  isMatch: boolean;
  matchType: 'full' | 'partial' | 'none';
  message: string;
  matchedRecord?: LawyerRecord;
}

/**
 * Normalize a string for comparison (uppercase, trim, remove extra spaces)
 */
function normalize(str: string): string {
  return str?.toUpperCase().trim().replace(/\s+/g, ' ') || '';
}

/**
 * Parse date string to comparable format
 * Handles formats like "April 16, 1946" or "MM/DD/YYYY"
 */
function parseRollDate(dateStr: string): { month: number; day: number; year: number } | null {
  if (!dateStr) return null;
  
  // Try parsing "Month Day, Year" format (e.g., "April 16, 1946")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const monthMatch = dateStr.toLowerCase().match(/([a-z]+)\s+(\d+),?\s+(\d{4})/);
  if (monthMatch) {
    const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
    if (monthIndex !== -1) {
      return {
        month: monthIndex + 1,
        day: parseInt(monthMatch[2], 10),
        year: parseInt(monthMatch[3], 10)
      };
    }
  }
  
  // Try parsing MM/DD/YYYY format
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return {
      month: parseInt(slashMatch[1], 10),
      day: parseInt(slashMatch[2], 10),
      year: parseInt(slashMatch[3], 10)
    };
  }
  
  // Try parsing YYYY-MM-DD format
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10),
      year: parseInt(isoMatch[1], 10)
    };
  }
  
  return null;
}

/**
 * Compare two dates for equality
 */
function datesMatch(date1: string, date2: string): boolean {
  const parsed1 = parseRollDate(date1);
  const parsed2 = parseRollDate(date2);
  
  if (!parsed1 || !parsed2) return false;
  
  return parsed1.month === parsed2.month &&
         parsed1.day === parsed2.day &&
         parsed1.year === parsed2.year;
}

/**
 * Check if a first name matches (handles multiple given names)
 */
function firstNameMatches(inputFirstName: string, recordFirstName: string): boolean {
  const inputNorm = normalize(inputFirstName);
  const recordNorm = normalize(recordFirstName);
  
  // Exact match
  if (inputNorm === recordNorm) return true;
  
  // Check if input is contained in record or vice versa (for multiple given names)
  const inputParts = inputNorm.split(' ');
  const recordParts = recordNorm.split(' ');
  
  // Check if first part matches
  if (inputParts[0] === recordParts[0]) return true;
  
  // Check if any input part matches any record part
  return inputParts.some(ip => recordParts.includes(ip));
}

/**
 * Validate lawyer credentials against the Supreme Court Roll of Attorneys
 */
export function validateLawyerCredentials(
  firstName: string,
  lastName: string,
  rollNumber: string,
  rollSignDate?: Date | string
): ValidationResult {
  const lawyers = lawyersList as LawyerRecord[];
  
  // First, find by roll number (most specific)
  const rollNumNorm = rollNumber?.trim();
  const matchByRollNumber = lawyers.find(
    lawyer => lawyer["Roll No."]?.trim() === rollNumNorm
  );
  
  if (!matchByRollNumber) {
    return {
      isMatch: false,
      matchType: 'none',
      message: 'Roll number not found. Either no record exists or the Supreme Court database may be outdated.'
    };
  }
  
  // Check if name matches
  const lastNameMatch = normalize(lastName) === normalize(matchByRollNumber.Lastname);
  const firstNameMatch = firstNameMatches(firstName, matchByRollNumber.Firstname);
  
  // Check if date matches (if provided)
  let dateMatch = true;
  if (rollSignDate) {
    const inputDateStr = rollSignDate instanceof Date 
      ? `${rollSignDate.getMonth() + 1}/${rollSignDate.getDate()}/${rollSignDate.getFullYear()}`
      : rollSignDate;
    dateMatch = datesMatch(inputDateStr, matchByRollNumber["Roll Signed Date"]);
  }
  
  // Full match - all fields match
  if (lastNameMatch && firstNameMatch && dateMatch) {
    return {
      isMatch: true,
      matchType: 'full',
      message: 'Verified! Credentials match the Supreme Court Roll of Attorneys.',
      matchedRecord: matchByRollNumber
    };
  }
  
  // Partial match - roll number found but other fields don't match
  const mismatches: string[] = [];
  if (!lastNameMatch) mismatches.push('last name');
  if (!firstNameMatch) mismatches.push('first name');
  if (!dateMatch) mismatches.push('roll sign date');
  
  return {
    isMatch: false,
    matchType: 'partial',
    message: `Roll number found but ${mismatches.join(', ')} does not match. Please verify your information.`,
    matchedRecord: matchByRollNumber
  };
}

/**
 * Quick check if roll number exists in the database
 */
export function rollNumberExists(rollNumber: string): boolean {
  const lawyers = lawyersList as LawyerRecord[];
  return lawyers.some(lawyer => lawyer["Roll No."]?.trim() === rollNumber?.trim());
}
