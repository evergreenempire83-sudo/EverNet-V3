export interface RevenueModel {
  premiumPercentage: number;
  creatorRPM: number;
  platformRPM: number;
  withdrawalFee: number;
  minWithdrawal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Creator {
  id: string;
  email: string;
  displayName: string;
  youtubeChannelId: string;
  tier: 'basic' | 'pro' | 'elite';
  referralCode: string;
  referredBy?: string;
  joinedDate: Date;
  status: 'active' | 'suspended';
  balance: {
    available: number;
    locked: number;
    totalEarned: number;
  };
}

export interface Video {
  id: string;
  creatorId: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  currentViews: number;
  lastRecordedViews: number;
  totalTrackedViews: number;
  premiumViews: number;
  earnings: number;
  isActive: boolean;
  lastUpdated: Date;
}

export interface Withdrawal {
  id: string;
  creatorId: string;
  amount: number;
  paypalEmail: string;
  requestedAt: Date;
  fee: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  processedAt?: Date;
  transactionId?: string;
}
