/**
 * Billing and Proration Utilities for SAFE-CRM
 */

/**
 * Calculates exact remaining days from client_since date up to 30 November of the current cycle.
 * prorated_fee = (annual_base_fee * days_remaining) / 365
 */
export function calculateProratedDecemberFee(clientSinceStr: Date | string, annualBaseFee: number): number {
  const startDate = new Date(clientSinceStr);
  startDate.setHours(0, 0, 0, 0);

  const startYear = startDate.getFullYear();
  
  // November 30 (month is 10 in 0-indexed JS Date)
  const targetDate = new Date(startYear, 10, 30);
  targetDate.setHours(0, 0, 0, 0);

  // If start date is after Nov 30 of the current year, target is Nov 30 of the next year
  if (startDate > targetDate) {
    targetDate.setFullYear(startYear + 1);
  }

  const diffTime = targetDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive of start day

  if (diffDays <= 0) return 0;

  const proratedFee = (annualBaseFee * diffDays) / 365;
  return parseFloat(proratedFee.toFixed(2));
}

/**
 * CCTV Tiered Billing Calculation
 */
export function calculateCctvTieredFee(cameraCount: number, baseFee = 250, additionalFee = 150): number {
  if (cameraCount <= 0) return 0;
  if (cameraCount === 1) return baseFee;
  return baseFee + (cameraCount - 1) * additionalFee;
}
