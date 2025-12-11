/**
 * Financial calculation utilities for EverNet
 */

/**
 * Calculate premium views (7% of total views by default)
 * @param {number} totalViews - Total view count
 * @param {number} premiumPercentage - Premium percentage (default: 7)
 * @returns {number} Premium views count
 */
function calculatePremiumViews(totalViews, premiumPercentage = 7) {
  return Math.floor(totalViews * (premiumPercentage / 100));
}

/**
 * Calculate earnings from premium views
 * @param {number} premiumViews - Number of premium views
 * @param {number} rpm - Revenue Per Mille (per 1000 views)
 * @returns {number} Earnings amount
 */
function calculateEarnings(premiumViews, rpm = 0.30) {
  return (premiumViews / 1000) * rpm;
}

/**
 * Calculate total earnings for a video
 * @param {number} totalViews - Total view count
 * @param {number} premiumPercentage - Premium percentage
 * @param {number} rpm - Revenue Per Mille
 * @returns {number} Total earnings
 */
function calculateTotalEarnings(totalViews, premiumPercentage = 7, rpm = 0.30) {
  const premiumViews = calculatePremiumViews(totalViews, premiumPercentage);
  return calculateEarnings(premiumViews, rpm);
}

/**
 * Calculate view difference between two scans
 * @param {number} previousViews - Previous view count
 * @param {number} currentViews - Current view count
 * @returns {number} View difference (positive if increased)
 */
function calculateViewDifference(previousViews, currentViews) {
  return Math.max(0, currentViews - previousViews);
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculate 90-day lock period
 * @param {Date} startDate - Start date
 * @param {number} days - Number of days to lock (default: 90)
 * @returns {Date} Lock end date
 */
function calculateLockEndDate(startDate, days = 90) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
}

/**
 * Check if report is unlockable (past lock period)
 * @param {Date} lockEndDate - Lock end date
 * @returns {boolean} True if unlockable
 */
function isUnlockable(lockEndDate) {
  return new Date() >= lockEndDate;
}

/**
 * Calculate days remaining until unlock
 * @param {Date} lockEndDate - Lock end date
 * @returns {number} Days remaining
 */
function daysUntilUnlock(lockEndDate) {
  const now = new Date();
  const diffTime = lockEndDate - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate withdrawal fee (if any)
 * @param {number} amount - Withdrawal amount
 * @param {number} feePercentage - Fee percentage (default: 0)
 * @param {number} minFee - Minimum fee (default: 0)
 * @returns {number} Fee amount
 */
function calculateWithdrawalFee(amount, feePercentage = 0, minFee = 0) {
  const fee = amount * (feePercentage / 100);
  return Math.max(fee, minFee);
}

/**
 * Calculate net withdrawal amount
 * @param {number} amount - Gross amount
 * @param {number} fee - Fee amount
 * @returns {number} Net amount
 */
function calculateNetWithdrawal(amount, fee) {
  return amount - fee;
}

module.exports = {
  calculatePremiumViews,
  calculateEarnings,
  calculateTotalEarnings,
  calculateViewDifference,
  formatCurrency,
  calculateLockEndDate,
  isUnlockable,
  daysUntilUnlock,
  calculateWithdrawalFee,
  calculateNetWithdrawal
};
