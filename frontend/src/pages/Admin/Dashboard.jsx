import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FaUsers,
  FaDollarSign,
  FaLock,
  FaMoneyCheckAlt,
  FaVideo,
  FaChartLine,
  FaCalendarCheck,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaSync
} from 'react-icons/fa';
import StatsCard from '../../components/shared/UI/StatsCards';
import RecentActivity from '../../components/admin/Dashboard/RecentActivity';
import EarningsChart from '../../components/admin/Dashboard/EarningsChart';
import { fetchDashboardStats, fetchRecentActivity } from '../../services/api/dashboard';

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', timeRange],
    queryFn: () => fetchDashboardStats(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: fetchRecentActivity,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchStats();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const statsCards = [
    {
      title: 'Total Earnings',
      value: `$${stats?.totalEarnings?.toFixed(2) || '0.00'}`,
      change: '+12.5%',
      trend: 'up',
      icon: FaDollarSign,
      color: 'gold',
      description: 'All-time platform earnings'
    },
    {
      title: 'Active Creators',
      value: stats?.activeCreators || '0',
      change: '+5.2%',
      trend: 'up',
      icon: FaUsers,
      color: 'navy',
      description: 'Currently active creators'
    },
    {
      title: 'Locked Balance',
      value: `$${stats?.totalLocked?.toFixed(2) || '0.00'}`,
      change: '+8.3%',
      trend: 'up',
      icon: FaLock,
      color: 'amber',
      description: '90-day locked funds'
    },
    {
      title: 'Available Balance',
      value: `$${stats?.totalAvailable?.toFixed(2) || '0.00'}`,
      change: '+15.7%',
      trend: 'up',
      icon: FaMoneyCheckAlt,
      color: 'emerald',
      description: 'Ready for withdrawal'
    },
    {
      title: 'Pending Withdrawals',
      value: stats?.pendingWithdrawals || '0',
      change: '-2.1%',
      trend: 'down',
      icon: FaExclamationTriangle,
      color: 'red',
      description: 'Awaiting approval'
    },
    {
      title: 'Videos Tracked',
      value: stats?.videosTracked || '0',
      change: '+23.4%',
      trend: 'up',
      icon: FaVideo,
      color: 'purple',
      description: 'Active YouTube videos'
    }
  ];

  const quickActions = [
    {
      title: 'Run Scanner',
      description: 'Scan all active videos now',
      icon: FaSync,
      action: () => console.log('Run scanner'),
      color: 'blue'
    },
    {
      title: 'Unlock Reports',
      description: 'Review and unlock expired reports',
      icon: FaCalendarCheck,
      action: () => console.log('Unlock reports'),
      color: 'green'
    },
    {
      title: 'Approve Withdrawals',
      description: 'Process pending withdrawal requests',
      icon: FaMoneyCheckAlt,
      action: () => console.log('Approve withdrawals'),
      color: 'gold'
    },
    {
      title: 'View Analytics',
      description: 'Detailed platform analytics',
      icon: FaChartLine,
      action: () => console.log('View analytics'),
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening with your platform today.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-primary"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FaSync className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <StatsCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Earnings Trend</h2>
                <p className="text-gray-600">Monthly revenue growth</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gold-primary rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Premium Views</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-navy-primary rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Regular Views</span>
                </div>
              </div>
            </div>
            <EarningsChart timeRange={timeRange} />
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="card p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="space-y-4">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.title}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.action}
                  className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className={`w-12 h-12 rounded-lg bg-${action.color}-100 flex items-center justify-center mr-4`}>
                    <action.icon className={`h-6 w-6 text-${action.color}-600`} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-medium text-gray-900 group-hover:text-navy-primary">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                  <div className="text-gray-400 group-hover:text-navy-primary">
                    <FaArrowUp className="transform rotate-45" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <p className="text-gray-600">Latest platform events and actions</p>
          </div>
          <button className="text-sm text-navy-primary hover:text-navy-dark font-medium">
            View All Activity →
          </button>
        </div>
        <RecentActivity activities={activity || []} loading={activityLoading} />
      </motion.div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'YouTube API', status: 'active', lastCheck: '2 min ago' },
          { label: 'Database', status: 'active', lastCheck: '1 min ago' },
          { label: 'Scanner', status: 'running', lastCheck: 'Now' },
          { label: 'Payment Gateway', status: 'active', lastCheck: '5 min ago' }
        ].map((system, index) => (
          <motion.div
            key={system.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{system.label}</h3>
                <p className="text-sm text-gray-500">Checked {system.lastCheck}</p>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  system.status === 'active' ? 'bg-green-500' :
                  system.status === 'running' ? 'bg-blue-500' :
                  'bg-red-500'
                } ${system.status === 'running' ? 'animate-pulse' : ''}`}></div>
                <span className="text-sm font-medium capitalize">{system.status}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
