export type UserRole = 'STAFF' | 'APPROVER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveType = 'REGULAR' | 'ADVANCE';

export type LedgerTransactionType =
  | 'OPENING_BALANCE'
  | 'MONTHLY_ACCRUAL'
  | 'APPROVED_LEAVE_DEBIT'
  | 'MANUAL_CREDIT'
  | 'MANUAL_DEBIT'
  | 'REVERSAL'
  | 'ADJUSTMENT';

export interface UserSession {
  id: string;
  employee_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  designation: string;
  whatsapp_number: string;
  requires_password_change?: boolean;
}

export interface LeaveCalculationResult {
  calendarDays: number;
  saturdaysExcluded: number;
  holidaysExcluded: number;
  excludedHolidayNames: string[];
  calculatedDays: number;
  isEligible: boolean;
  validationError?: string;
}

export interface EmployeeBalanceSummary {
  currentBalance: number;
  totalAccrued: number;
  totalUsed: number;
  pendingDays: number;
  availableForNewRequests: number;
}
