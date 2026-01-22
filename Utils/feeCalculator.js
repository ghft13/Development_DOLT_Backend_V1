/**
 * Fee Calculator Utility
 * Calculates DOLT platform fees and marketplace charges
 */

const DOLT_FEE_PERCENTAGE = 2.05; // 2.05%
const MARKETPLACE_CHARGE_PERCENTAGE = 5.0; // 5%

/**
 * Calculate fees for a given base amount
 * @param {number} baseAmount - The original price before fees
 * @returns {object} Fee breakdown with all amounts
 */
const calculateFees = (baseAmount) => {
    // Ensure baseAmount is a valid number
    const base = parseFloat(baseAmount) || 0;

    if (base < 0) {
        throw new Error('Base amount cannot be negative');
    }

    // Calculate individual fees
    const doltFee = (base * DOLT_FEE_PERCENTAGE) / 100;
    const marketplaceCharge = (base * MARKETPLACE_CHARGE_PERCENTAGE) / 100;
    const totalFees = doltFee + marketplaceCharge;
    const finalAmount = base + totalFees;

    // Round to 2 decimal places for currency
    return {
        baseAmount: parseFloat(base.toFixed(2)),
        doltFee: parseFloat(doltFee.toFixed(2)),
        doltFeePercentage: DOLT_FEE_PERCENTAGE,
        marketplaceCharge: parseFloat(marketplaceCharge.toFixed(2)),
        marketplaceChargePercentage: MARKETPLACE_CHARGE_PERCENTAGE,
        totalFees: parseFloat(totalFees.toFixed(2)),
        finalAmount: parseFloat(finalAmount.toFixed(2))
    };
};

/**
 * Get fee breakdown as a formatted object for database storage
 * @param {number} baseAmount - The original price before fees
 * @returns {object} Simplified fee object for Firestore
 */
const getFeeBreakdown = (baseAmount) => {
    const fees = calculateFees(baseAmount);

    return {
        base_amount: fees.baseAmount,
        dolt_fee: fees.doltFee,
        marketplace_charge: fees.marketplaceCharge,
        total_amount: fees.finalAmount
    };
};

module.exports = {
    calculateFees,
    getFeeBreakdown,
    DOLT_FEE_PERCENTAGE,
    MARKETPLACE_CHARGE_PERCENTAGE
};
