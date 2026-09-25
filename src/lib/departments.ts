/**
 * Centralized Department Management & Matching Utilities
 * 
 * Supports standard organization departments for Jay Nepal NGO & its initiatives:
 * 1. Bodgaun Primary Hospital
 * 2. School of Social Development (SOSD)
 * 3. IT Education Program
 * 4. Jay Nepal NGO
 */

export const STANDARD_DEPARTMENTS = [
  'Bodgaun Primary Hospital',
  'School of Social Development (SOSD)',
  'IT Education Program',
  'Jay Nepal NGO',
] as const;

export type StandardDepartment = (typeof STANDARD_DEPARTMENTS)[number];

/**
 * Normalizes any department string or abbreviation into a clean category key
 * to guarantee accurate matching even with minor naming variations.
 */
export function getDepartmentCategory(dept?: string | null): string {
  if (!dept) return 'OTHER';
  const d = dept.toLowerCase().trim();

  // Bodgaun Primary Hospital (Hospital, BPH, Bodgaun)
  if (
    d.includes('hospital') ||
    d.includes('bodgaun') ||
    d.includes('bph')
  ) {
    return 'HOSPITAL';
  }

  // School of Social Development (SOSD)
  if (d.includes('sosd') || d.includes('social development')) {
    return 'SOSD';
  }

  // IT Education Program (IT, Tech)
  if (
    d.includes('it ') ||
    d === 'it' ||
    d.includes('technology') ||
    d.includes('it education')
  ) {
    return 'IT';
  }

  // Jay Nepal NGO / Central Office
  if (
    d.includes('jay nepal') ||
    d.includes('ngo') ||
    d.includes('administration') ||
    d.includes('executive')
  ) {
    return 'NGO';
  }

  return d;
}

/**
 * Returns true if two department strings belong to the same department cluster
 */
export function isSameDepartment(deptA?: string | null, deptB?: string | null): boolean {
  if (!deptA || !deptB) return false;
  return getDepartmentCategory(deptA) === getDepartmentCategory(deptB);
}

/**
 * Friendly display name for department badge
 */
export function getDepartmentLabel(dept?: string | null): string {
  if (!dept) return 'General';
  const cat = getDepartmentCategory(dept);
  switch (cat) {
    case 'HOSPITAL':
      return 'Bodgaun Primary Hospital';
    case 'SOSD':
      return 'School of Social Development (SOSD)';
    case 'IT':
      return 'IT Education Program';
    case 'NGO':
      return 'Jay Nepal NGO';
    default:
      return dept.trim();
  }
}
