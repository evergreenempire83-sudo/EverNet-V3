import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  limit
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/shared/Layout/CreatorLayout';
import { 
  DollarSign, 
  TrendingUp, 
  Lock, 
  Unlock, 
  Video, 
  Clock,
  Calendar,
  BarChart3,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Banknote,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate, formatViews } from '../../utils/formatters';
import { FINANCIAL_CONSTANTS } from '../../utils/constants';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CreatorDashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatorData, setCreatorData] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState([]);
  const [videosStats, setVideosStats] = useState(null);
  const [earningsChart, setEarningsChart] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [quickStats, setQuickStats] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    lockedBalance: 0,
    totalWithdrawn: 0,
    activeVideos: 0,
    totalViews: 0,
    premiumViews: 0,
    monthlyEarnings: 0
  });

  // Fetch all dashboard data on component mount
  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCreatorData(),
        fetchRecentReports(),
        fetchRecentWithdrawals(),
        fetchVideosStats(),
        fetchEarningsChart(),
        fetchNotifications()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatorData = async () => {
    try {
      if (!currentUser?.uid) return;

      const creatorRef = doc(db, 'users', currentUser.uid);
      const creatorDoc = await getDoc(creatorRef);
      
      if (creatorDoc.exists()) {
        const data = creatorDoc.data();
        setCreatorData(data);
        
        // Update quick stats
        setQuickStats(prev => ({
          ...prev,
          totalEarnings: data.totalEarnings || 0,
          availableBalance: data.availableBalance || 0,
          lockedBalance: data.lockedBalance || 0,
          totalWithdrawn: data.totalWithdrawn || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
      throw error;
    }
  };

  const fetchRecentReports = async () => {
    try {
      if (!currentUser?.uid) return;

      const reportsRef = collection(db, 'monthly_reports');
      const q = query(
        reportsRef,
        where('creatorId', '==', currentUser.uid),
        orderBy('month', 'desc'),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const reports = [];
      
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });

      setRecentReports(reports);

      // Calculate monthly earnings
      const monthlyEarnings = reports.length > 0 
        ? reports[0].payoutAmount || 0
        : 0;
      
      setQuickStats(prev => ({
        ...prev,
        monthlyEarnings
      }));
    } catch (error) {
      console.error('Error fetching recent reports:', error);
      throw error;
    }
  };

  const fetchRecentWithdrawals = async () => {
    try {
      if (!currentUser?.uid) return;

      const withdrawalsRef = collection(db, 'withdrawal_requests');
      const q = query(
        withdrawalsRef,
        where('creatorId', '==', currentUser.uid),
        orderBy('requestedAt', 'desc'),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const withdrawals = [];
      
      querySnapshot.forEach((doc) => {
        withdrawals.push({ id: doc.id, ...doc.data() });
      });

      setRecentWithdrawals(withdrawals);
    } catch (error) {
      console.error('Error fetching recent withdrawals:', error);
      throw error;
    }
  };

  const fetchVideosStats = async () => {
    try {
      if (!currentUser?.uid) return;

      const videosRef = collection(db, 'scanned_videos');
      const q = query(
        videosRef,
        where('creatorId', '==', currentUser.uid),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      let totalViews = 0;
      let premiumViews = 0;
      let activeVideos = 0;

      querySnapshot.forEach((doc) => {
        const video = doc.data();
        activeVideos++;
        totalViews += video.totalYouTubeViews || 0;
        premiumViews += video.totalPremiumViews || 0;
      });

      setVideosStats({
        activeVideos,
        totalViews,
        premiumViews,
        premiumPercentage: totalViews > 0 ? (premiumViews / totalViews * 100) : 0
      });

      setQuickStats(prev => ({
        ...prev,
        activeVideos,
        totalViews,
        premiumViews
      }));
    } catch (error) {
      console.error('Error fetching videos stats:', error);
      throw error;
    }
  };

  const fetchEarningsChart = async () => {
    try {
      if (!currentUser?.uid) return;

      const reportsRef = collection(db, 'monthly_reports');
      const q = query(
        reportsRef,
        where('creatorId', '==', currentUser.uid),
        orderBy('month', 'desc'),
        limit(6)
      );

      const querySnapshot = await getDocs(q);
      const chartData = [];
      
      querySnapshot.forEach((doc) => {
        const report = doc.data();
        chartData.unshift({
          month: new Date(report.month).toLocaleDateString('en-US', { month: 'short' }),
          earnings: report.payoutAmount || 0,
          status: report.status
        });
      });

      setEarningsChart(chartData);
    } catch (error) {
      console.error('Error fetching earnings chart:', error);
      throw error;
    }
  };

  const fetchNotifications = async () => {
    try {
      if (!currentUser?.uid) return;

      // For now, we'll create sample notifications
      // In Phase 3, we'll integrate with the notifications collection
      const sampleNotifications = [
        {
          id: '1',
          title: 'Welcome to EverNet!',
          message: 'Start adding your YouTube videos to begin earning',
          category: 'system',
          date: new Date(),
          read: false
        },
        {
          id: '2',
          title: 'Monthly Report Generated',
          message: 'Your earnings for November 2024 have been calculated',
          category: 'report',
          date: new Date(Date.now() - 86400000), // 1 day ago
          read: true
        },
        {
          id: '3',
          title: 'Withdrawal Approved',
          message: 'Your withdrawal of $150.00 has been processed',
          category: 'payment',
          date: new Date(Date.now() - 172800000), // 2 days ago
          read: true
        }
      ];

      setNotifications(sampleNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed!');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const statsCards = [
    {
      title: 'Available Balance',
      value: formatCurrency(quickStats.availableBalance),
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-green-500',
      description: 'Ready to withdraw',
      change: '+$45.20 this month'
    },
    {
      title: 'Locked Balance',
      value: formatCurrency(quickStats.lockedBalance),
      icon: <Lock className="h-6 w-6" />,
      color: 'bg-amber-500',
      description: 'Unlocks in 90 days',
      change: `${FINANCIAL_CONSTANTS.LOCK_PERIOD_DAYS}-day hold`
    },
    {
      title: 'Total Earnings',
      value: formatCurrency(quickStats.totalEarnings),
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-blue-500',
      description: 'All-time earnings',
      change: '+12% from last month'
    },
    {
      title: 'Active Videos',
      value: quickStats.activeVideos,
      icon: <Video className="h-6 w-6" />,
      color: 'bg-purple-500',
      description: 'Currently being scanned',
      change: `${formatViews(quickStats.totalViews)} total views`
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {creatorData?.displayName || 'Creator'}!
            </h1>
            <p className="text-gray-600">Here's your earnings overview and recent activity</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => toast.success('Export feature coming soon!')}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-600">{stat.change}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Earnings Chart & Recent Reports */}
          <div className="lg:col-span-2 space-y-6">
            {/* Earnings Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Earnings Trend</h2>
                  <p className="text-sm text-gray-600">Last 6 months of earnings</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Earnings</span>
                  </span>
                </div>
              </div>
              
              <div className="h-64">
                {earningsChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={earningsChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`$${value}`, 'Earnings']}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="earnings"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">No earnings data yet</p>
                    <p className="text-sm text-gray-400">Start adding videos to see your earnings chart</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recent Monthly Reports</h2>
                    <p className="text-sm text-gray-600">Your last 5 monthly earnings reports</p>
                  </div>
                  <button
                    onClick={() => window.location.href = '/creator/earnings'}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {recentReports.length > 0 ? (
                  recentReports.map((report, index) => (
                    <div key={report.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            report.status === 'locked' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {report.status === 'locked' ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {new Date(report.month).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long' 
                              })}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.videos?.length || 0} videos • {report.status === 'locked' ? 'Locked' : 'Unlocked'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-gray-900">
                            {formatCurrency(report.payoutAmount || 0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {report.status === 'locked' ? `Unlocks ${formatDate(report.lockedUntil, 'short')}` : 'Available now'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No monthly reports yet</p>
                    <p className="text-sm text-gray-400 mt-1">Reports are generated at the end of each month</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Notifications & Quick Actions */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                    <p className="text-sm text-gray-600">Recent updates and alerts</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {notifications.filter(n => !n.read).length} new
                  </span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`px-6 py-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 p-1.5 rounded-full ${
                        notification.category === 'payment' 
                          ? 'bg-green-100 text-green-600'
                          : notification.category === 'report'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {notification.category === 'payment' ? (
                          <DollarSign className="h-3 w-3" />
                        ) : notification.category === 'report' ? (
                          <FileText className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="bg-blue-500 h-2 w-2 rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDate(notification.date, 'datetime')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-600">Common tasks and shortcuts</p>
              </div>
              
              <div className="p-4 space-y-3">
                <button
                  onClick={() => window.location.href = '/creator/withdrawals'}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-all"
                  disabled={quickStats.availableBalance < FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Request Withdrawal</div>
                      <div className="text-sm text-gray-600">
                        Min: {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </button>

                <button
                  onClick={() => window.location.href = '/creator/videos'}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Video className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Manage Videos</div>
                      <div className="text-sm text-gray-600">
                        {quickStats.activeVideos} active videos
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </button>

                <button
                  onClick={() => window.location.href = '/creator/profile'}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-violet-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Payment Settings</div>
                      <div className="text-sm text-gray-600">
                        Update PayPal or bank details
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </button>

                <button
                  onClick={() => toast.success('Help documentation coming soon!')}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg hover:from-gray-100 hover:to-slate-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Help & Support</div>
                      <div className="text-sm text-gray-600">
                        FAQ, guides, and contact
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Recent Withdrawals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recent Withdrawals</h2>
                    <p className="text-sm text-gray-600">Last 5 withdrawal requests</p>
                  </div>
                  <button
                    onClick={() => window.location.href = '/creator/withdrawals'}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {recentWithdrawals.length > 0 ? (
                  recentWithdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${
                            withdrawal.status === 'approved'
                              ? 'bg-green-100 text-green-600'
                              : withdrawal.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {withdrawal.status === 'approved' ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : withdrawal.status === 'pending' ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {withdrawal.method === 'paypal' ? 'PayPal' : 'Bank'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(withdrawal.requestedAt, 'short')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${
                            withdrawal.status === 'approved' 
                              ? 'text-green-600'
                              : withdrawal.status === 'pending'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(withdrawal.amount)}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {withdrawal.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No withdrawal history</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Withdraw your earnings when you reach {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Video Statistics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Video Performance</h2>
              <p className="text-sm text-gray-600">Overview of your YouTube videos</p>
            </div>
            <button
              onClick={() => window.location.href = '/creator/videos'}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              View All Videos
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Views Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Views</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatViews(quickStats.totalViews)}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Across {quickStats.activeVideos} active videos
              </div>
            </div>

            {/* Premium Views */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Premium Views</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatViews(quickStats.premiumViews)}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {videosStats?.premiumPercentage?.toFixed(1) || 0}% of total views
              </div>
            </div>

            {/* Earnings Rate */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Earnings Rate</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(FINANCIAL_CONSTANTS.PAYOUT_RATE_PER_1000)}/1000
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}% premium views
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Method */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Payment Method</h3>
                <p className="text-sm text-gray-600">How you receive payments</p>
              </div>
            </div>
            
            {creatorData?.paymentMethod ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">
                    {creatorData.paymentMethod.type === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                  </span>
                </div>
                {creatorData.paymentMethod.type === 'paypal' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">PayPal Email:</span>
                    <span className="font-medium">{creatorData.paymentMethod.paypalEmail}</span>
                  </div>
                )}
                <button
                  onClick={() => window.location.href = '/creator/profile'}
                  className="w-full mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  Update Payment Details
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-3">No payment method set up</p>
                <button
                  onClick={() => window.location.href = '/creator/profile'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Set Up Payment Method
                </button>
              </div>
            )}
          </div>

          {/* Next Payout */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Next Payout</h3>
                <p className="text-sm text-gray-600">Estimated timeline</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Available Balance:</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(quickStats.availableBalance)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Minimum Withdrawal:</span>
                <span className="font-medium">
                  {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}
                </span>
              </div>
              
              {quickStats.availableBalance >= FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">Ready to Withdraw!</div>
                      <div className="text-sm text-green-700">
                        You can request a withdrawal now
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/creator/withdrawals'}
                    className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Request Withdrawal
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div>
                      <div className="font-medium text-amber-800">Not Yet Available</div>
                      <div className="text-sm text-amber-700">
                        Need {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL - quickStats.availableBalance)} more
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreatorDashboard;
