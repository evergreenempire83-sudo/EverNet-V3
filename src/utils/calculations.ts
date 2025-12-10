import { RevenueModel } from '../types';

export const calculateEarnings = (newViews: number, revenueModel: RevenueModel) => {
  const premiumViews = newViews * revenueModel.premiumPercentage;
  const creatorEarnings = (premiumViews / 1000) * revenueModel.creatorRPM;
  const platformEarnings = (newViews / 1000) * revenueModel.platformRPM;
  
  return {
    premiumViews,
    creatorEarnings: Number(creatorEarnings.toFixed(4)),
    platformEarnings: Number(platformEarnings.toFixed(4))
  };
};

export const calculateWithdrawal = (amount: number, feePercent: number) => {
  const fee = amount * feePercent;
  return {
    fee: Number(fee.toFixed(2)),
    netAmount: Number((amount - fee).toFixed(2))
  };
};
