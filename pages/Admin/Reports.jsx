import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/shared/Layout/AdminLayout';
import StatsCards from '../../components/shared/UI/StatsCards';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Lock, 
  Unlock,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Users,
  Clock,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  FileText,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters';
import { REPORT_STATUS, FINANCIAL_CONSTANTS } from '../../utils/constants';
import { calculateEarnings, calculatePremiumViews } from '../../utils/helpers';

const Reports = () => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    month: 'all',
    minAmount: '',
    maxAmount: '',
    creatorId: 'all'
  });
  const [sortConfig, setSortConfig] = useState({ key: 'month', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showBulkUnlockModal, setShowBulkUnlockModal] = useState(false);
  const [creators, setCreators] = useState([]);
  const [stats, setStats] = useState({
    totalReports: 0,
    lockedReports: 0,
    unlockedReports: 0,
    totalLockedAmount: 0,
    totalUnlockedAmount: 0,
    readyToUnlock: 0
  });
  const [bulkSelection, setBulkSelection] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch reports and creators on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...reports];

    // Apply search
    if (searchTerm) {
      result = result.filter(report =>
        report.reportId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.creatorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(report => report.status === filters.status);
    }

    if (filters.month !== 'all') {
      result = result.filter(report => report.month === filters.month);
    }

    if (filters.creatorId !== 'all') {
      result = result.filter(report => report.creatorId === filters.creatorId);
    }

    if (filters.minAmount) {
      result = result.filter(report => 
        report.payoutAmount >= parseFloat(filters.minAmount)
      );
    }

    if (filters.maxAmount) {
      result = result.filter(report => 
        report.payoutAmount <= parseFloat(filters.maxAmount)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested objects and dates
        if (sortConfig.key === 'month') {
          aValue = new Date(aValue);
          bValue = new Date(b.value);
        }

        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aValue = keys.reduce((obj, key) => obj?.[key], a);
          bValue = keys.reduce((obj, key) => obj?.[key], b);
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
  }, [reports, searchTerm, filters, sortConfig]);

  // Calculate stats
  useEffect(() => {
    const statsData = {
      totalReports: reports.length,
      lockedReports: reports.filter(r => r.status === 'locked').length,
      unlockedReports: reports.filter(r => r.status === 'unlocked').length,
      totalLockedAmount: reports
        .filter(r => r.status === 'locked')
        .reduce((sum, r) => sum + r.payoutAmount, 0),
      totalUnlockedAmount: reports
        .filter(r => r.status === 'unlocked')
        .reduce((sum, r) => sum + r.payoutAmount, 0),
      readyToUnlock: reports.filter(r => 
        r.status === 'locked' && 
        r.lockedUntil && 
        new Date(r.lockedUntil.seconds * 1000) <= new Date()
      ).length
    };
    setStats(statsData);
  }, [reports]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchReports(),
        fetchCreators()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const reportsRef = collection(db, 'monthly_reports');
      const q = query(reportsRef, orderBy('month', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const reportsList = [];
      const creatorPromises = [];

      querySnapshot.forEach((doc) => {
        const report = { id: doc.id, ...doc.data() };
        reportsList.push(report);
        
        // Fetch creator info for each report
        if (report.creatorId) {
          creatorPromises.push(
            getCreatorInfo(report.creatorId).then(creator => {
              report.creatorName = creator?.displayName || 'Unknown Creator';
              report.creatorEmail = creator?.email || 'No email';
            })
          );
        }
      });

      // Wait for all creator info to be fetched
      await Promise.all(creatorPromises);
      setReports(reportsList);
      setFilteredReports(reportsList);
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  };

  const fetchCreators = async () => {
    try {
      const creatorsRef = collection(db, 'users');
      const q = query(creatorsRef, where('role', '==', 'creator'), orderBy('displayName'));
      const querySnapshot = await getDocs(q);
      
      const creatorsList = [];
      querySnapshot.forEach((doc) => {
        creatorsList.push({ id: doc.id, ...doc.data() });
      });

      setCreators(creatorsList);
    } catch (error) {
      console.error('Error fetching creators:', error);
      throw error;
    }
  };

  const getCreatorInfo = async (creatorId) => {
    try {
      const creatorRef = doc(db, 'users', creatorId);
      const creatorDoc = await getDoc(creatorRef);
      return creatorDoc.exists() ? creatorDoc.data() : null;
    } catch (error) {
      console.error('Error fetching creator info:', error);
      return null;
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
    setCurrentPage(1);
  };

  const handleUnlockReport = async (reportId, bulkMode = false) => {
    try {
      const reportRef = doc(db, 'monthly_reports', reportId);
      const reportDoc = await getDoc(reportRef);
      
      if (!reportDoc.exists()) {
        toast.error('Report not found');
        return;
      }

      const report = reportDoc.data();
      
      // Check if report is still locked
      if (report.status !== 'locked') {
        toast.error('Report is already unlocked');
        return;
      }

      // Update report status
      await updateDoc(reportRef, {
        status: 'unlocked',
        unlockedAt: serverTimestamp(),
        unlockedBy: currentUser.uid
      });

      // Update creator's balance
      const creatorRef = doc(db, 'users', report.creatorId);
      const creatorDoc = await getDoc(creatorRef);
      
      if (creatorDoc.exists()) {
        const creator = creatorDoc.data();
        await updateDoc(creatorRef, {
          lockedBalance: (creator.lockedBalance || 0) - report.payoutAmount,
          availableBalance: (creator.availableBalance || 0) + report.payoutAmount,
          lastReportDate: serverTimestamp()
        });
      }

      // Create audit log
      await addDoc(collection(db, 'audit_logs'), {
        action: 'report_unlocked',
        userId: currentUser.uid,
        targetId: reportId,
        changes: {
          before: { status: 'locked' },
          after: { status: 'unlocked' }
        },
        timestamp: serverTimestamp()
      });

      // Update local state
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { 
              ...r, 
              status: 'unlocked',
              unlockedAt: new Date(),
              unlockedBy: currentUser.uid
            }
          : r
      ));

      if (!bulkMode) {
        toast.success('Report unlocked successfully!');
        setShowUnlockModal(false);
      }

      return true;
    } catch (error) {
      console.error('Error unlocking report:', error);
      toast.error('Failed to unlock report');
      return false;
    }
  };

  const handleBulkUnlock = async () => {
    if (bulkSelection.length === 0) {
      toast.error('Please select reports to unlock');
      return;
    }

    const reportsToUnlock = reports.filter(r => 
      bulkSelection.includes(r.id) && 
      r.status === 'locked' &&
      r.lockedUntil &&
      new Date(r.lockedUntil.seconds * 1000) <= new Date()
    );

    if (reportsToUnlock.length === 0) {
      toast.error('No eligible reports to unlock');
      return;
    }

    setRefreshing(true);
    let successCount = 0;
    let failedCount = 0;

    for (const report of reportsToUnlock) {
      const success = await handleUnlockReport(report.id, true);
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    setRefreshing(false);
    setBulkSelection([]);
    setShowBulkUnlockModal(false);

    if (successCount > 0) {
      toast.success(`Successfully unlocked ${successCount} report${successCount !== 1 ? 's' : ''}`);
    }
    if (failedCount > 0) {
      toast.error(`Failed to unlock ${failedCount} report${failedCount !== 1 ? 's' : ''}`);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredReports.map(report => ({
      'Report ID': report.reportId,
      'Creator': report.creatorName,
      'Month': report.month,
      'Status': report.status === 'locked' ? 'Locked' : 'Unlocked',
      'Payout Amount': formatCurrency(report.payoutAmount),
      'Locked Until': report.lockedUntil 
        ? formatDate(report.lockedUntil, 'short')
        : 'N/A',
      'Unlocked At': report.unlockedAt 
        ? formatDate(report.unlockedAt, 'short')
        : 'N/A',
      'Videos Count': report.videos?.length || 0,
      'Total Views': report.videos?.reduce((sum, v) => sum + (v.views || 0), 0) || 0,
      'Premium Views': report.videos?.reduce((sum, v) => sum + (v.premiumViews || 0), 0) || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Reports');
    XLSX.writeFile(wb, `evernet-reports-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data exported successfully');
  };

  const handleToggleBulkSelection = (reportId) => {
    setBulkSelection(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    if (bulkSelection.length === currentReports.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(currentReports.map(r => r.id));
    }
  };

  const getMonthsList = () => {
    const months = new Set(reports.map(r => r.month));
    return Array.from(months).sort((a, b) => new Date(b) - new Date(a));
  };

  const viewReportDetails = (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  const initiateUnlock = (report) => {
    setSelectedReport(report);
    setShowUnlockModal(true);
  };

  const getDaysRemaining = (lockedUntil) => {
    if (!lockedUntil) return null;
    
    const now = new Date();
    const unlockDate = new Date(lockedUntil.seconds * 1000);
    const diffTime = unlockDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const isReadyToUnlock = (report) => {
    if (report.status !== 'locked') return false;
    if (!report.lockedUntil) return false;
    
    const daysRemaining = getDaysRemaining(report.lockedUntil);
    return daysRemaining <= 0;
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const statsCardsData = [
    {
      title: 'Total Reports',
      value: stats.totalReports,
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-blue-500',
      change: null
    },
    {
      title: 'Locked Amount',
      value: formatCurrency(stats.totalLockedAmount),
      icon: <Lock className="h-6 w-6" />,
      color: 'bg-amber-500',
      change: null
    },
    {
      title: 'Ready to Unlock',
      value: stats.readyToUnlock,
      icon: <Unlock className="h-6 w-6" />,
      color: 'bg-green-500',
      change: null
    },
    {
      title: 'Total Unlocked',
      value: formatCurrency(stats.totalUnlockedAmount),
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-purple-500',
      change: null
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
            <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
            <p className="text-gray-600">Manage 90-day locked reports and approve payouts</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
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
            {bulkSelection.length > 0 && (
              <button
                onClick={() => setShowBulkUnlockModal(true)}
                className="btn-primary flex items-center gap-2"
                disabled={bulkSelection.filter(id => {
                  const report = reports.find(r => r.id === id);
                  return report && isReadyToUnlock(report);
                }).length === 0}
              >
                <Unlock className="h-4 w-4" />
                Unlock Selected ({bulkSelection.length})
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <StatsCards stats={statsCardsData} />

        {/* Bulk Actions Bar */}
        {bulkSelection.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium text-blue-800">
                  {bulkSelection.length} report{bulkSelection.length !== 1 ? 's' : ''} selected
                </span>
                <div className="text-sm text-gray-600">
                  {bulkSelection.filter(id => {
                    const report = reports.find(r => r.id === id);
                    return report && isReadyToUnlock(report);
                  }).length} ready to unlock
                </div>
              </div>
              <button
                onClick={() => setBulkSelection([])}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            </div>
          </motion.div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Month Filter */}
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Months</option>
              {getMonthsList().map(month => (
                <option key={month} value={month}>
                  {new Date(month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </option>
              ))}
            </select>

            {/* Creator Filter */}
            <select
              value={filters.creatorId}
              onChange={(e) => handleFilterChange('creatorId', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Creators</option>
              {creators.map(creator => (
                <option key={creator.id} value={creator.id}>
                  {creator.displayName}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setFilters({
                  status: 'all',
                  month: 'all',
                  minAmount: '',
                  maxAmount: '',
                  creatorId: 'all'
                });
                setSearchTerm('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Amount Range */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min $"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
              <input
                type="number"
                placeholder="Max $"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>

            {/* Ready to Unlock Filter */}
            <button
              onClick={() => {
                const readyReports = reports.filter(isReadyToUnlock);
                setFilteredReports(readyReports);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <Unlock className="h-4 w-4" />
              Show Ready to Unlock ({stats.readyToUnlock})
            </button>

            {/* Show Only Locked */}
            <button
              onClick={() => handleFilterChange('status', 'locked')}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Show Locked Only ({stats.lockedReports})
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={bulkSelection.length === currentReports.length && currentReports.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
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
                    onClick={() => handleSort('creatorName')}
                  >
                    <div className="flex items-center gap-1">
                      Creator
                      {sortConfig.key === 'creatorName' && (
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
                      Payout Amount
                      {sortConfig.key === 'payoutAmount' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lockedUntil')}
                  >
                    <div className="flex items-center gap-1">
                      Locked Until
                      {sortConfig.key === 'lockedUntil' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Videos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentReports.map((report) => {
                  const daysRemaining = getDaysRemaining(report.lockedUntil);
                  const readyToUnlock = isReadyToUnlock(report);
                  
                  return (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={bulkSelection.includes(report.id)}
                          onChange={() => handleToggleBulkSelection(report.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={!readyToUnlock}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(report.month).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.reportId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {report.creatorName?.charAt(0) || 'C'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {report.creatorName || 'Unknown Creator'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {report.creatorEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            report.status === 'locked'
                              ? readyToUnlock
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {report.status === 'locked' ? (
                              <>
                                {readyToUnlock ? (
                                  <>
                                    <Unlock className="mr-1 h-3 w-3" />
                                    Ready to Unlock
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-1 h-3 w-3" />
                                    Locked
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Unlocked
                              </>
                            )}
                          </span>
                          {report.status === 'locked' && daysRemaining !== null && (
                            <div className={`text-xs ${readyToUnlock ? 'text-green-600' : 'text-amber-600'}`}>
                              {readyToUnlock ? 'Ready now' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(report.payoutAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.videos?.length || 0} video{report.videos?.length !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.lockedUntil ? (
                          <div>
                            <div>{formatDate(report.lockedUntil, 'short')}</div>
                            {report.status === 'unlocked' && report.unlockedAt && (
                              <div className="text-xs text-green-600">
                                Unlocked {formatDate(report.unlockedAt, 'short')}
                              </div>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.videos?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          {report.videos?.reduce((sum, v) => sum + (v.views || 0), 0).toLocaleString() || 0} views
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewReportDetails(report)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {report.status === 'locked' && readyToUnlock && (
                            <button
                              onClick={() => initiateUnlock(report)}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Unlock Report"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                          {report.status === 'locked' && !readyToUnlock && daysRemaining !== null && (
                            <span className="text-amber-500 p-1" title={`${daysRemaining} days remaining`}>
                              <Clock className="h-4 w-4" />
                            </span>
                          )}
                          {report.status === 'unlocked' && (
                            <span className="text-green-500 p-1" title="Unlocked">
                              <CheckCircle className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                      })} • {selectedReport.creatorName}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedReport.status === 'locked'
                      ? isReadyToUnlock(selectedReport)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedReport.status === 'locked' 
                      ? isReadyToUnlock(selectedReport) ? 'Ready to Unlock' : 'Locked'
                      : 'Unlocked'
                    }
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
                        <span className="text-gray-600">Creator</span>
                        <span className="font-medium">{selectedReport.creatorName}</span>
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
                        <span className="text-gray-600">Payout Amount</span>
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
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status</span>
                        <span className={`font-medium ${
                          selectedReport.status === 'locked'
                            ? isReadyToUnlock(selectedReport) ? 'text-green-600' : 'text-amber-600'
                            : 'text-blue-600'
                        }`}>
                          {selectedReport.status === 'locked' 
                            ? isReadyToUnlock(selectedReport) ? 'Ready to Unlock' : 'Locked'
                            : 'Unlocked'
                          }
                        </span>
                      </div>
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
                          {selectedReport.unlockedBy && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Unlocked By</span>
                              <span>Admin</span>
                            </div>
                          )}
                        </>
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
                              {selectedReport.videos?.reduce((sum, v) => sum + (v.views || 0), 0).toLocaleString() || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Premium Percentage:</span>
                            <span>{FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Premium Views:</span>
                            <span>
                              {selectedReport.videos?.reduce((sum, v) => sum + (v.premiumViews || 0), 0).toLocaleString() || 0}
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
                            <span className="text-gray-600">Calculated Payout:</span>
                            <span className="font-medium">
                              {formatCurrency(selectedReport.payoutAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Lock Period:</span>
                            <span>{FINANCIAL_CONSTANTS.LOCK_PERIOD_DAYS} days</span>
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
                  {selectedReport.status === 'locked' && isReadyToUnlock(selectedReport) && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        initiateUnlock(selectedReport);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Unlock className="h-4 w-4" />
                      Unlock Report
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlock Report Modal */}
      <AnimatePresence>
        {showUnlockModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Unlock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Unlock Report</h2>
                    <p className="text-gray-600">Release locked funds to creator</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Creator:</span>
                        <span className="font-medium">{selectedReport.creatorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Month:</span>
                        <span>
                          {new Date(selectedReport.month).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(selectedReport.payoutAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800">Funds Transfer</h4>
                        <p className="text-sm text-green-700 mt-1">
                          This will move ${formatCurrency(selectedReport.payoutAmount)} from the creator's locked balance to available balance. The creator can now withdraw these funds.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Important Note</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          This action cannot be undone. Please ensure you are unlocking the correct report.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowUnlockModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleUnlockReport(selectedReport.id);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Unlock className="h-4 w-4" />
                    Confirm Unlock
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Unlock Modal */}
      <AnimatePresence>
        {showBulkUnlockModal && bulkSelection.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Unlock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Bulk Unlock Reports</h2>
                    <p className="text-gray-600">Unlock multiple reports at once</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selected Reports:</span>
                        <span className="font-medium">{bulkSelection.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Eligible to Unlock:</span>
                        <span className="font-medium">
                          {bulkSelection.filter(id => {
                            const report = reports.find(r => r.id === id);
                            return report && isReadyToUnlock(report);
                          }).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(
                            bulkSelection
                              .filter(id => {
                                const report = reports.find(r => r.id === id);
                                return report && isReadyToUnlock(report);
                              })
                              .reduce((sum, id) => {
                                const report = reports.find(r => r.id === id);
                                return sum + (report?.payoutAmount || 0);
                              }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800">Batch Processing</h4>
                        <p className="text-sm text-green-700 mt-1">
                          This will unlock all eligible reports and transfer funds to creators' available balances.
                        </p>
                      </div>
                    </div>
                  </div>

                  {bulkSelection.length > 5 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">Large Batch</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Processing {bulkSelection.length} reports may take a moment. Please do not close this window.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowBulkUnlockModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkUnlock}
                    disabled={refreshing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    {refreshing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        Unlock All Eligible
                      </>
                    )}
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

export default Reports;
