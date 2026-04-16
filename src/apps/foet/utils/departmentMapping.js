/**
 * Department mapping utilities — dynamic, no hardcoded department lists.
 * Short codes are institution-scoped to prevent collisions across faculties.
 */
import {
  generateDepartmentCode,
  generateUniqueDepartmentCode,
  getInstitutionPrefix,
  getInstitutionGroup,
  getForwardingStatus,
  getDeptStatus,
  getFacultyInterviewStatus,
} from '../../../utils/departmentUtils';

export {
  generateDepartmentCode,
  generateUniqueDepartmentCode,
  getInstitutionPrefix,
  getInstitutionGroup,
  getForwardingStatus,
  getDeptStatus,
  getFacultyInterviewStatus,
};

/**
 * Get department code from a department name + institution.
 * Uses institution-scoped code to avoid collisions.
 * @param {string} departmentName
 * @param {string} [institution]
 * @returns {string|null}
 */
export const getDepartmentFromProgram = (departmentName, institution = null) => {
  if (!departmentName) return null;
  return generateUniqueDepartmentCode(departmentName, institution || '');
};

/**
 * Construct the forwarding status string from an institution value.
 * @param {string} institution
 * @returns {string|null}
 */
export const constructForwardingStatus = (institution) => getForwardingStatus(institution);

/**
 * Construct the faculty_status value (FORWARDED_TO_<INST>_<CODE>) from dept + institution.
 * Institution is required to avoid collisions between similarly-named departments.
 * @param {string} departmentName
 * @param {string} [institution]
 * @returns {string}
 */
export const constructFacultyStatus = (departmentName, institution = '') => {
  const code = generateUniqueDepartmentCode(departmentName, institution);
  return `FORWARDED_TO_${code}`;
};

/**
 * Validate if a scholar can be forwarded.
 * Uses institution column (not program/faculty).
 * @param {object} scholar
 * @returns {{ canForward: boolean, error: string|null, department: string|null }}
 */
export const validateScholarForForwarding = (scholar) => {
  if (!scholar) {
    return { canForward: false, error: 'Scholar data not found', department: null };
  }

  if (scholar.faculty_status && scholar.faculty_status.startsWith('FORWARDED_TO_')) {
    return { canForward: false, error: 'Already forwarded', department: null };
  }

  const deptName = scholar.department;
  if (!deptName) {
    return { canForward: false, error: 'Scholar department information is missing', department: null };
  }

  const code = generateUniqueDepartmentCode(deptName, scholar.institution || '');
  return { canForward: true, error: null, department: code };
};

/**
 * Check if a scholar needs a status sync.
 * @param {object} scholar
 * @returns {boolean}
 */
export const needsStatusSync = (scholar) => {
  if (!scholar) return false;
  return (
    scholar.faculty_status &&
    scholar.faculty_status.startsWith('FORWARDED_TO_') &&
    !scholar.status?.startsWith('Forwarded to')
  );
};
