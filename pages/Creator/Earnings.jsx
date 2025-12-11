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
  Calendar, 
  Lock, 
  Unlock, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Search,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  Video,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate, formatViews } from '../../utils/formatters';
import { FINANCIAL_CONSTANTS } from '../../utils/constants';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import * as XLSX from 'xlsx';

const CreatorEarnings = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    year: 'all',
    month: 'all'
  });
  const [sortConfig, setSortConfig] = useState({ key: 'month', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [earningsStats, setEarningsStats] = useState({
    totalEarnings: 0,
    totalUnlocked: 0,
    totalLocked: 0,
    averageMonthly: 0,
    bestMonth: { month: '', amount: 0 },
    reportsCount: 0,
    totalVideos: 0,
    totalViews: 0,
    totalPremiumViews: 0
  });
  const [earningsChart, setEarningsChart] = useState([]);
  const [yearlyBreakdown, setYearlyBreakdown] = useState([]);

  // Fetch earnings data on component mount
  useEffect(() => {
    if (currentUser) {
      fetchEarningsData();
    }
  }, [currentUser]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...reports];

    // Apply search
    if (searchTerm) {
      result = result.filter(report =>
        report.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reportId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(report => report.status === filters.status);
    }

    if (filters.year !== 'all') {
      result = result.filter(report => report.month.startsWith(filters.year));
    }

    if (filters.month !== 'all') {
      result = result.filter(report => {
        const reportMonth = new Date(report.month).getMonth() + 1;
        return reportMonth === parseInt(filters.month);
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle dates
        if (sortConfig.key === 'month') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredReports(result);
    setCurrentPage(1);
  }, [reports, searchTerm, filters, sortConfig]);

  const fetchEarningsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMonthlyReports(),
        fetchEarningsStats(),
        fetchEarningsChart(),
        fetchYearlyBreakdown()
      ]);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReports = async () => {
    try {
      if (!currentUser?.uid) return;

      const reportsRef = collection(db, 'monthly_reports');
      const q = query(
        reportsRef,
        where('creatorId', '==', currentUser.uid),
        orderBy('month', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const reportsList = [];
      
      querySnapshot.forEach((doc) => {
        reportsList.push({ id: doc.id, ...doc.data() });
      });

      setReports(reportsList);
      setFilteredReports(reportsList);
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
      throw error;
    }
  };

  const fetchEarningsStats = async () => {
    try {
      if (!currentUser?.uid) return;

      const reportsRef = collection(db, 'monthly_reports');
      const q = query(
        reportsRef,
        where('creatorId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      let totalEarnings = 0;
      let totalUnlocked = 0;
      let totalLocked = 0;
      let bestMonth = { month: '', amount: 0 };
      let totalVideos = 0;
      let totalViews = 0;
      let totalPremiumViews = 0;

      querySnapshot.forEach((doc) => {
        const report = doc.data();
        totalEarnings += report.payoutAmount || 0;
        
        if (report.status === 'unlocked') {
          totalUnlocked += report.payoutAmount || 0;
        } else if (report.status === 'locked') {
          totalLocked += report.payoutAmount || 0;
        }

        if ((report.payoutAmount || 0) > bestMonth.amount) {
          bestMonth = { month: report.month, amount: report.payoutAmount || 0 };
        }

        totalVideos += report.videos?.length || 0;
        totalViews += report.totalViews || 0;
        totalPremiumViews += report.totalPremiumViews || 0;
      });

      setEarningsStats({
        totalEarnings,
        totalUnlocked,
        totalLocked,
        averageMonthly: querySnapshot.size > 0 ? totalEarnings / querySnapshot.size : 0,
        bestMonth,
        reportsCount: querySnapshot.size,
        totalVideos,
        totalViews,
        totalPremiumViews
      });
    } catch (error) {
      console.error('Error fetching earnings stats:', error);
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
        orderBy('month', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const chartData = [];
      
      querySnapshot.forEach((doc) => {
        const report = doc.data();
        chartData.push({
          month: new Date(report.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          earnings: report.payoutAmount || 0,
          status: report.status,
          videos: report.videos?.length || 0,
          views: report.totalViews || 0
        });
      });

      setEarningsChart(chartData);
    } catch (error) {
      console.error('Error fetching earnings chart:', error);
      throw error;
    }
  };

  const fetchYearlyBreakdown = async () => {
    try {
      if (!currentUser?.uid) return;

      const reportsRef = collection(db, 'monthly_reports');
      const q = query(
        reportsRef,
        where('creatorId', '==', currentUser.uid),
        orderBy('month', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const yearlyData = {};
      
      querySnapshot.forEach((doc) => {
        const report = doc.data();
        const year = report.month.split('-')[0];
        
        if (!yearlyData[year]) {
          yearlyData[year] = {
            earnings: 0,
            reports: 0,
            videos: 0,
            locked: 0,
            unlocked: 0
          };
        }

        yearlyData[year].earnings += report.payoutAmount || 0;
        yearlyData[year].reports += 1;
        yearlyData[year].videos += report.videos?.length || 0;
        
        if (report.status === 'locked') {
          yearlyData[year].locked += report.payoutAmount || 0;
        } else {
          yearlyData[year].unlocked += report.payoutAmount || 0;
        }
      });

      const breakdown = Object.entries(yearlyData).map(([year, data]) => ({
        year,
        ...data,
        average: data.reports > 0 ? data.earnings / data.reports : 0
      })).sort((a, b) => b.year - a.year);

      setYearlyBreakdown(breakdown);
    } catch (error) {
      console.error('Error fetching yearly breakdown:', error);
      throw error;
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportCSV = () => {
    const exportData = filteredReports.map(report => ({
      'Month': new Date(report.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      'Earnings': formatCurrency(report.payoutAmount),
      'Status': report.status === 'locked' ? 'Locked (90 days)' : 'Unlocked',
      'Videos': report.videos?.length || 0,
      'Total Views': (report.totalViews || 0).toLocaleString(),
      'Premium Views': (report.totalPremiumViews || 0).toLocaleString(),
      'Premium %': `${((report.totalPremiumViews || 0) / (report.totalViews || 1) * 100).toFixed(1)}%`,
      'Locked Until': report.lockedUntil ? formatDate(report.lockedUntil, 'short') : 'N/A',
      'Unlocked At': report.unlockedAt ? formatDate(report.unlockedAt, 'short') : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Earnings History');
    XLSX.writeFile(wb, `evernet-earnings-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Earnings data exported successfully');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEarningsData();
    setRefreshing(false);
    toast.success('Earnings data refreshed!');
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const getYearsList = () => {
    const years = new Set(reports.map(r => r.month.split('-')[0]));
    return Array.from(years).sort((a, b) => b - a);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'locked':
        return <Lock className="h-4 w-4" />;
      case 'unlocked':
        return <Unlock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'locked':
        return 'bg-amber-100 text-amber-800';
      case 'unlocked':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (lockedUntil) => {
    if (!lockedUntil) return null;
    
    const now = new Date();
    const unlockDate = lockedUntil.toDate ? lockedUntil.toDate() : new Date(lockedUntil);
    const diffTime = unlockDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const statsCards = [
    {
      title: 'Total Earnings',
      value: formatCurrency(earningsStats.totalEarnings),
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-green-500',
      description: 'All-time earnings',
      trend: '+12%'
    },
    {
      title: 'Available Balance',
      value: formatCurrency(earningsStats.totalUnlocked),
      icon: <Unlock className="h-6 w-6" />,
      color: 'bg-blue-500',
      description: 'Ready to withdraw',
      trend: earningsStats.reportsCount > 0 ? `${Math.round((earningsStats.totalUnlocked / earningsStats.totalEarnings) * 100)}% unlocked` : '0%'
    },
    {
      title: 'Locked Balance',
      value: formatCurrency(earningsStats.totalLocked),
      icon: <Lock className="h-6 w-6" />,
      color: 'bg-amber-500',
      description: 'Unlocks in 90 days',
      trend: `${FINANCIAL_CONSTANTS.LOCK_PERIOD_DAYS}-day hold`
    },
    {
      title: 'Average Monthly',
      value: formatCurrency(earningsStats.averageMonthly),
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-purple-500',
      description: 'Per report average',
      trend: earningsStats.reportsCount > 0 ? `${earningsStats.reportsCount} reports` : 'No reports'
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
            <h1 className="text-2xl font-bold text-gray-900">Earnings & Reports</h1>
            <p className="text-gray-600">View your monthly earnings and report history</p>
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
              onClick={handleExportCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
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
                <p className="text-xs text-gray-600">{stat.trend}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Earnings Trend</h2>
                <p className="text-sm text-gray-600">Monthly earnings over time</p>
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
                  <AreaChart data={earningsChart}>
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
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No earnings data yet</p>
                  <p className="text-sm text-gray-400">Earnings will appear after your first monthly report</p>
                </div>
              )}
            </div>
          </div>

          {/* Yearly Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Yearly Breakdown</h2>
                <p className="text-sm text-gray-600">Earnings by year</p>
              </div>
              {yearlyBreakdown.length > 0 && (
                <div className="text-sm text-gray-600">
                  Total: {yearlyBreakdown.length} year{yearlyBreakdown.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="h-64">
              {yearlyBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'earnings') return [`$${value}`, 'Total Earnings'];
                        if (name === 'reports') return [value, 'Reports'];
                        return [value, name];
                      }}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Bar 
                      dataKey="earnings" 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]}
                      name="Total Earnings"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No yearly data yet</p>
                  <p className="text-sm text-gray-400">Yearly breakdown will appear after your first report</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="locked">Locked</option>
              <option value="unlocked">Unlocked</option>
            </select>

            {/* Year Filter */}
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Years</option>
              {getYearsList().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setFilters({ status: 'all', year: 'all', month: 'all' });
                setSearchTerm('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('month')}
                  >
                    <div className="flex items-center gap-1">
                      Month
                      {sortConfig.key === 'month' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortConfig.key === 'status' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('payoutAmount')}
                  >
                    <div className="flex items-center gap-1">
                      Earnings
                      {sortConfig.key === 'payoutAmount' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Videos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Premium %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentReports.length > 0 ? (
                  currentReports.map((report) => {
                    const daysRemaining = getDaysRemaining(report.lockedUntil);
                    const premiumPercentage = report.totalViews > 0 
                      ? (report.totalPremiumViews / report.totalViews * 100) 
                      : 0;
                    
                    return (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(report.month).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long' 
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            Report ID: {report.reportId}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              {getStatusIcon(report.status)}
                              <span className="ml-1">
                                {report.status === 'locked' ? 'Locked' : 'Unlocked'}
                              </span>
                            </span>
                            {report.status === 'locked' && daysRemaining !== null && (
                              <div className={`text-xs ${daysRemaining <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                {daysRemaining <= 0 ? 'Ready to unlock' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`}
                              </div>
                            )}
                            {report.status === 'unlocked' && report.unlockedAt && (
                              <div className="text-xs text-green-600">
                                Unlocked {formatDate(report.unlockedAt, 'short')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(report.payoutAmount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency((report.payoutAmount || 0) / (report.videos?.length || 1))} per video
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {report.videos?.length || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatViews(report.totalViews || 0)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatViews(report.totalPremiumViews || 0)} premium
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {premiumPercentage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Target: {FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => viewReportDetails(report)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No reports found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {reports.length === 0 
                          ? 'Monthly reports will appear here after your first month' 
                          : 'Try adjusting your filters'
                        }
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredReports.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredReports.length}</span> reports
                </div>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Best Month */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Best Month</h3>
                <p className="text-sm text-gray-600">Highest earnings in a single month</p>
              </div>
            </div>
            {earningsStats.bestMonth.amount > 0 ? (
              <>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(earningsStats.bestMonth.amount)}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(earningsStats.bestMonth.month).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </div>
              </>
            ) : (
              <div className="text-gray-500">No best month yet</div>
            )}
          </div>

          {/* Total Videos */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Video className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Total Videos</h3>
                <p className="text-sm text-gray-600">Across all monthly reports</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {earningsStats.totalVideos}
            </div>
            <div className="text-sm text-gray-600">
              {earningsStats.reportsCount} report{earningsStats.reportsCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Premium Rate */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Premium Rate</h3>
                <p className="text-sm text-gray-600">Average premium percentage</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {earningsStats.totalViews > 0 
                ? `${((earningsStats.totalPremiumViews / earningsStats.totalViews) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <div className="text-sm text-gray-600">
              Target: {FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}%
            </div>
          </div>
        </div>
      </div>

      {/* Report Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Monthly Report Details
                    </h2>
                    <p className="text-gray-600">
                      {new Date(selectedReport.month).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReport.status)}`}>
                    {getStatusIcon(selectedReport.status)}
                    <span className="ml-1">
                      {selectedReport.status === 'locked' ? 'Locked' : 'Unlocked'}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Report Summary */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Report Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Report ID</span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {selectedReport.reportId}
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Month</span>
                        <span>
                          {new Date(selectedReport.month).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status</span>
                        <span className={`font-medium ${
                          selectedReport.status === 'locked' ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          {selectedReport.status === 'locked' ? 'Locked (90 days)' : 'Unlocked'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Earnings</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(selectedReport.payoutAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lock Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Lock Details</h3>
                    <div className="space-y-3">
                      {selectedReport.lockedUntil && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Locked Until</span>
                            <span>{formatDate(selectedReport.lockedUntil, 'long')}</span>
                          </div>
                          {selectedReport.status === 'locked' && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Days Remaining</span>
                              <span className={`font-medium ${
                                getDaysRemaining(selectedReport.lockedUntil) <= 0 
                                  ? 'text-green-600' 
                                  : 'text-amber-600'
                              }`}>
                                {getDaysRemaining(selectedReport.lockedUntil) <= 0 
                                  ? 'Ready to unlock!' 
                                  : `${getDaysRemaining(selectedReport.lockedUntil)} day${getDaysRemaining(selectedReport.lockedUntil) !== 1 ? 's' : ''} left`
                                }
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {selectedReport.status === 'unlocked' && selectedReport.unlockedAt && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Unlocked At</span>
                            <span>{formatDate(selectedReport.unlockedAt, 'long')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Unlocked By</span>
                            <span>Admin</span>
                          </div>
                        </>
                      )}
                      {!selectedReport.lockedUntil && (
                        <div className="text-gray-500">No lock information available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Video Breakdown */}
                {selectedReport.videos && selectedReport.videos.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Video Breakdown ({selectedReport.videos.length} videos)
                    </h3>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Video
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Views
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Premium Views
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Earnings
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedReport.videos.map((video, index) => (
                            <tr key={index} className="hover:bg-white">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                  {video.title || `Video ${index + 1}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {video.videoId || 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {(video.views || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {(video.premiumViews || 0).toLocaleString()}
                                <div className="text-xs text-gray-500">
                                  {video.premiumPercentage || FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}%
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {formatCurrency(video.earnings || 0)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-semibold">
                            <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {selectedReport.videos.reduce((sum, v) => sum + (v.views || 0), 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {selectedReport.videos.reduce((sum, v) => sum + (v.premiumViews || 0), 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(selectedReport.videos.reduce((sum, v) => sum + (v.earnings || 0), 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Calculations Breakdown */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculations</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">View Calculations</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Views:</span>
                            <span>
                              {(selectedReport.totalViews || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Premium Percentage:</span>
                            <span>{FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Premium Views:</span>
                            <span>
                              {(selectedReport.totalPremiumViews || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Actual Premium Rate:</span>
                            <span className="font-medium">
                              {selectedReport.totalViews > 0 
                                ? `${((selectedReport.totalPremiumViews / selectedReport.totalViews) * 100).toFixed(1)}%`
                                : '0%'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Earnings Calculation</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payout Rate:</span>
                            <span>{formatCurrency(FINANCIAL_CONSTANTS.PAYOUT_RATE_PER_1000)} per 1000 views</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Premium Views:</span>
                            <span>{(selectedReport.totalPremiumViews || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">÷ 1000:</span>
                            <span>{((selectedReport.totalPremiumViews || 0) / 1000).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">× Rate:</span>
                            <span className="font-medium">
                              {formatCurrency(((selectedReport.totalPremiumViews || 0) / 1000) * FINANCIAL_CONSTANTS.PAYOUT_RATE_PER_1000)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex justify-between">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Export this specific report
                      const exportData = [{
                        'Month': new Date(selectedReport.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
                        'Earnings': formatCurrency(selectedReport.payoutAmount),
                        'Status': selectedReport.status === 'locked' ? 'Locked (90 days)' : 'Unlocked',
                        'Videos': selectedReport.videos?.length || 0,
                        'Total Views': (selectedReport.totalViews || 0).toLocaleString(),
                        'Premium Views': (selectedReport.totalPremiumViews || 0).toLocaleString(),
                        'Premium %': `${((selectedReport.totalPremiumViews || 0) / (selectedReport.totalViews || 1) * 100).toFixed(1)}%`,
                        'Locked Until': selectedReport.lockedUntil ? formatDate(selectedReport.lockedUntil, 'short') : 'N/A',
                        'Unlocked At': selectedReport.unlockedAt ? formatDate(selectedReport.unlockedAt, 'short') : 'N/A'
                      }];

                      const ws = XLSX.utils.json_to_sheet(exportData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Report Details');
                      XLSX.writeFile(wb, `evernet-report-${selectedReport.month}.xlsx`);
                      toast.success('Report exported successfully');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export This Report
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default CreatorEarnings;
