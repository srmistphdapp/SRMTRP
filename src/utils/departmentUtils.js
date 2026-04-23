/**
 * Dynamic department utilities — no hardcoded department lists.
 * Short codes are generated algorithmically from department name + institution.
 * Institution prefix ensures codes never collide across different institutions.
 */

/**
 * Get a short institution prefix from the institution string.
 * e.g. "Faculty of Engineering & Technology" -> "ENG"
 *      "Faculty of Science & Humanities"     -> "SCI"
 *      "Faculty of Management"               -> "MGT"
 *      "Faculty of Medical and Health Sciences" -> "MED"
 * @param {string} institution
 * @returns {string} 2-3 char uppercase prefix
 */
export const getInstitutionPrefix = (institution) => {
  if (!institution) return '';
  const inst = institution.toLowerCase();
  // Medical must be checked BEFORE engineering/technology to avoid misclassifying
  // "Medical and Health Sciences" (contains 'science') or technology-named medical depts
  if (inst.includes('medical') || inst.includes('health') || inst.includes('dentistry')) return 'MED';
  if (inst.includes('engineering') || inst.includes('technology')) return 'ENG';
  if (inst.includes('science') || inst.includes('humanities')) return 'SCI';
  if (inst.includes('management') || inst.includes('business')) return 'MGT';
  // Generic fallback: first 3 letters of first significant word
  const words = institution.replace(/^faculty\s+of\s+/i, '').trim().split(/\s+/);
  return words[0].substring(0, 3).toUpperCase();
};

/**
 * Generate a short code from a department name alone (no institution context).
 * Algorithm: first letter of each significant word, uppercase, max 6 chars.
 * Strips common prefixes like "Department of", "Faculty of".
 * @param {string} departmentName
 * @returns {string} e.g. "Computer Science Engineering" -> "CSE"
 */
export const generateDepartmentCode = (departmentName) => {
  if (!departmentName || typeof departmentName !== 'string') return 'UNKNOWN';

  // Strip common prefixes
  let name = departmentName
    .replace(/^(department\s+of|faculty\s+of)\s+/i, '')
    .trim();

  const stopWords = new Set(['and', 'of', 'the', 'in', 'for', 'a', 'an', '&']);
  const words = name
    .split(/[\s\-&]+/)
    .map(w => w.replace(/[^a-zA-Z]/g, ''))
    .filter(w => w.length > 0 && !stopWords.has(w.toLowerCase()));

  if (words.length === 0) {
    return name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 6) || 'UNKNOWN';
  }

  let code = words.map(w => w[0].toUpperCase()).join('');
  code = code.substring(0, 6);

  // Ensure minimum 3 characters — pad by taking more letters from the first word
  if (code.length < 3 && words.length > 0) {
    const extra = words[0].substring(1).toUpperCase(); // letters after the first
    code = (code + extra).substring(0, 3);
  }

  return code;
};

/**
 * Generate a globally unique department code by combining institution prefix + dept code.
 * This prevents collisions when two institutions have similarly-named departments.
 * e.g. "Biotechnology" in Engineering  -> "ENG_BT"
 *      "Biotechnology" in Science      -> "SCI_BT"
 *      "Mathematics"   in Engineering  -> "ENG_M"
 *      "Mathematics"   in Science      -> "SCI_M"
 * @param {string} departmentName
 * @param {string} institution
 * @returns {string}
 */
export const generateUniqueDepartmentCode = (departmentName, institution) => {
  const deptCode = generateDepartmentCode(departmentName);
  const instPrefix = getInstitutionPrefix(institution);
  if (!instPrefix) return deptCode;
  return `${instPrefix}_${deptCode}`;
};

/**
 * Derive the institution group from an institution string using keyword matching.
 * Returns one of: 'Engineering', 'Science', 'Medical', 'Management', or null.
 * @param {string} institution
 * @returns {string|null}
 */
export const getInstitutionGroup = (institution) => {
  if (!institution) return null;
  const inst = institution.toLowerCase();
  // Medical must be checked BEFORE engineering/technology to avoid misclassifying
  // "Medical and Health Sciences" (contains 'science') or technology-named medical depts
  if (inst.includes('medical') || inst.includes('health') || inst.includes('dentistry')) return 'Medical';
  if (inst.includes('engineering') || inst.includes('technology')) return 'Engineering';
  if (inst.includes('science') || inst.includes('humanities')) return 'Science';
  if (inst.includes('management') || inst.includes('business')) return 'Management';
  return null;
};

/**
 * Get the forwarding status string for a given institution.
 * e.g. "Faculty of Engineering & Technology" -> "Forwarded to Engineering"
 * @param {string} institution
 * @returns {string|null}
 */
export const getForwardingStatus = (institution) => {
  const group = getInstitutionGroup(institution);
  if (!group) return null;
  return `Forwarded to ${group}`;
};

/**
 * Get the dept_status value (Back_To_X) for a given institution.
 * @param {string} institution
 * @returns {string|null}
 */
export const getDeptStatus = (institution) => {
  const group = getInstitutionGroup(institution);
  if (!group) return null;
  return `Back_To_${group}`;
};

/**
 * Get the faculty_interview forwarding value (Forwarded_To_X) for a given institution.
 * @param {string} institution
 * @returns {string}
 */
export const getFacultyInterviewStatus = (institution) => {
  const group = getInstitutionGroup(institution) || 'Engineering';
  return `Forwarded_To_${group}`;
};

/**
 * CRITICAL: Normalize faculty names to handle ALL variations of "and" and "&"
 * Handles:
 * - "and", "AND", "And" → all converted to "and"
 * - "&" → converted to "and"
 * - Plural forms: "sciences" → "science"
 * - Extra whitespace
 * 
 * This is the PRIMARY function for all faculty matching.
 * @param {string} name - Faculty name to normalize
 * @returns {string} - Normalized faculty name
 * @example
 * normalizeFacultyName("Faculty of Engineering & Technology") 
 * → "faculty of engineering and technology"
 * normalizeFacultyName("Faculty of Medical AND Health Sciences") 
 * → "faculty of medical and health science"
 */
export const normalizeFacultyName = (name) => {
  if (!name) return '';
  return name
    .toString()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')        // & → and (with spaces)
    .replace(/\band\b/gi, 'and')         // Normalize all "AND", "And" variations to "and"
    .replace(/sciences\b/g, 'science')   // Plural → singular
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
};

/**
 * CRITICAL: Normalize department names similarly to faculty names
 * This ensures consistent department matching across the application
 * @param {string} name - Department name to normalize
 * @returns {string} - Normalized department name
 */
export const normalizeDepartmentName = (name) => {
  if (!name) return '';
  return name
    .toString()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')        // & → and
    .replace(/\band\b/gi, 'and')         // Normalize all AND variations to "and"
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
};

/**
 * CRITICAL: Faculty matching with IF-ELSE LADDER logic
 * Handles the "and" problem across the application
 * 
 * Logic order:
 * 1. First try: normalize both and compare for exact match
 * 2. Second try: normalize both and check if one includes the other
 * 3. Third try: if above fails, try the "&" variant (check if "&" version matches)
 * 
 * @param {string} faculty1 - First faculty name
 * @param {string} faculty2 - Second faculty name to match
 * @returns {boolean} - True if faculties match
 * @example
 * isFacultyMatch("Faculty of Engineering & Technology", "Faculty of Engineering and Technology") → true
 * isFacultyMatch("Faculty of Medical AND Health Science", "Faculty of Medical & Health Sciences") → true
 */
export const isFacultyMatch = (faculty1, faculty2) => {
  if (!faculty1 || !faculty2) return false;

  // Step 1: Normalize both and check for exact match
  const norm1 = normalizeFacultyName(faculty1);
  const norm2 = normalizeFacultyName(faculty2);

  if (norm1 === norm2) {
    return true;
  }

  // Step 2: Check if one includes the other (partial match)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }

  // Step 3: Try alternative "&" matching if above doesn't match
  // Create alternate form with "&" instead of "and"
  const alt1 = norm1.replace(/\sand\s/g, ' & ');
  const alt2 = norm2.replace(/\sand\s/g, ' & ');

  if (alt1 === alt2 || alt1.includes(alt2) || alt2.includes(alt1)) {
    return true;
  }

  return false;
};

/**
 * Normalize department matching with the same robust logic as faculty matching
 * @param {string} dept1 - First department name
 * @param {string} dept2 - Second department name
 * @returns {boolean} - True if departments match
 */
export const isDepartmentMatch = (dept1, dept2) => {
  if (!dept1 || !dept2) return false;

  // Normalize both
  const norm1 = normalizeDepartmentName(dept1);
  const norm2 = normalizeDepartmentName(dept2);

  // Exact match
  if (norm1 === norm2) {
    return true;
  }

  // Partial match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }

  return false;
};
