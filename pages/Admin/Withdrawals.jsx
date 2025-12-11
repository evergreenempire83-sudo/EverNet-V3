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
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Send,
  AlertTriangle,
  MoreVertical,
  ExternalLink,
  User,
  TrendingUp,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate, formatStatus } from '../../utils/formatters';
import { WITHDRAWAL_STATUS, PAYMENT_METHODS, FINANCIAL_CONSTANTS } from '../../utils/constants';

const Withdrawals = () => {
  const { currentUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    minAmount: '',
    maxAmount: '',
    creatorId: 'all',
    dateRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState({ key: 'requestedAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [creators, setCreators] = useState([]);
  const [stats, setStats] = useState({
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    approvedWithdrawals: 0,
    rejectedWithdrawals: 0,
    totalPendingAmount: 0,
    totalApprovedAmount: 0,
    totalRejectedAmount: 0
  });
  const [bulkSelection, setBulkSelection] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [bulkAction, setBulkAction] = useState('');

  // Fetch withdrawals and creators on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...withdrawals];

    // Apply search
    if (searchTerm) {
      result = result.filter(withdrawal =>
        withdrawal.requestId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.creatorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.creatorEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(withdrawal => withdrawal.status === filters.status);
    }

    if (filters.method !== 'all') {
      result = result.filter(withdrawal => withdrawal.method === filters.method);
    }

    if (filters.creatorId !== 'all') {
      result = result.filter(withdrawal => withdrawal.creatorId === filters.creatorId);
    }

    if (filters.minAmount) {
      result = result.filter(withdrawal => 
        withdrawal.amount >= parseFloat(filters.minAmount)
      );
    }

    if (filters.maxAmount) {
      result = result.filter(withdrawal => 
        withdrawal.amount <= parseFloat(filters.maxAmount)
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      
      if (startDate) {
        result = result.filter(withdrawal => {
          const requestedDate = withdrawal.requestedAt?.toDate 
            ? withdrawal.requestedAt.toDate()
            : new Date(withdrawal.requestedAt);
          return requestedDate >= startDate;
        });
      }
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested objects and dates
        if (sortConfig.key.includes('At') && aValue?.toDate) {
          aValue = aValue.toDate();
          bValue = bValue.toDate();
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

    setFilteredWithdrawals(result);
  }, [withdrawals, searchTerm, filters, sortConfig]);

  // Calculate stats
  useEffect(() => {
    const statsData = {
      totalWithdrawals: withdrawals.length,
      pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
      approvedWithdrawals: withdrawals.filter(w => w.status === 'approved').length,
      rejectedWithdrawals: withdrawals.filter(w => w.status === 'rejected').length,
      totalPendingAmount: withdrawals
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + w.amount, 0),
      totalApprovedAmount: withdrawals
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.amount, 0),
      totalRejectedAmount: withdrawals
        .filter(w => w.status === 'rejected')
        .reduce((sum, w) => sum + w.amount, 0)
    };
    setStats(statsData);
  }, [withdrawals]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchWithdrawals(),
        fetchCreators()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const withdrawalsRef = collection(db, 'withdrawal_requests');
      const q = query(withdrawalsRef, orderBy('requestedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const withdrawalsList = [];
      const creatorPromises = [];

      querySnapshot.forEach((doc) => {
        const withdrawal = { id: doc.id, ...doc.data() };
        withdrawalsList.push(withdrawal);
        
        // Fetch creator info for each withdrawal
        if (withdrawal.creatorId) {
          creatorPromises.push(
            getCreatorInfo(withdrawal.creatorId).then(creator => {
              withdrawal.creatorName = creator?.displayName || 'Unknown Creator';
              withdrawal.creatorEmail = creator?.email || 'No email';
              withdrawal.creatorAvailableBalance = creator?.availableBalance || 0;
            })
          );
        }
      });

      // Wait for all creator info to be fetched
      await Promise.all(creatorPromises);
      setWithdrawals(withdrawalsList);
      setFilteredWithdrawals(withdrawalsList);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
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

  const handleProcessWithdrawal = async (withdrawalId, action, reason = '') => {
    try {
      const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
      const withdrawalDoc = await getDoc(withdrawalRef);
      
      if (!withdrawalDoc.exists()) {
        toast.error('Withdrawal request not found');
        return false;
      }

      const withdrawal = withdrawalDoc.data();
      
      // Check if withdrawal is still pending
      if (withdrawal.status !== 'pending') {
        toast.error(`Withdrawal is already ${withdrawal.status}`);
        return false;
      }

      const updates = {
        status: action,
        processedAt: serverTimestamp(),
        processedBy: currentUser.uid
      };

      if (action === 'rejected' && reason) {
        updates.rejectionReason = reason;
      }

      if (action === 'approved' && withdrawal.receiptUrl) {
        updates.receiptUrl = withdrawal.receiptUrl;
      }

      // Update withdrawal request
      await updateDoc(withdrawalRef, updates);

      // Update creator's balance if approved
      if (action === 'approved') {
        const creatorRef = doc(db, 'users', withdrawal.creatorId);
        const creatorDoc = await getDoc(creatorRef);
        
        if (creatorDoc.exists()) {
          const creator = creatorDoc.data();
          await updateDoc(creatorRef, {
            availableBalance: (creator.availableBalance || 0) - withdrawal.amount,
            totalWithdrawn: (creator.totalWithdrawn || 0) + withdrawal.amount
          });
        }
      }

      // Create audit log
      await addDoc(collection(db, 'audit_logs'), {
        action: `withdrawal_${action}`,
        userId: currentUser.uid,
        targetId: withdrawalId,
        changes: {
          before: { status: 'pending' },
          after: { status: action, ...(reason && { rejectionReason: reason }) }
        },
        timestamp: serverTimestamp()
      });

      // Update local state
      setWithdrawals(prev => prev.map(w => 
        w.id === withdrawalId 
          ? { 
              ...w, 
              status: action,
              processedAt: new Date(),
              processedBy: currentUser.uid,
              ...(reason && { rejectionReason: reason })
            }
          : w
      ));

      toast.success(`Withdrawal ${action} successfully!`);
      
      // Close modals
      if (action === 'approved') {
        setShowApproveModal(false);
      } else {
        setShowRejectModal(false);
      }

      return true;
    } catch (error) {
      console.error(`Error ${action}ing withdrawal:`, error);
      toast.error(`Failed to ${action} withdrawal`);
      return false;
    }
  };

  const handleBulkAction = async () => {
    if (bulkSelection.length === 0 || !bulkAction) {
      toast.error('Please select withdrawals and an action');
      return;
    }

    const withdrawalsToProcess = withdrawals.filter(w => 
      bulkSelection.includes(w.id) && 
      w.status === 'pending'
    );

    if (withdrawalsToProcess.length === 0) {
      toast.error('No eligible withdrawals to process');
      return;
    }

    setRefreshing(true);
    let successCount = 0;
    let failedCount = 0;

    for (const withdrawal of withdrawalsToProcess) {
      const success = await handleProcessWithdrawal(
        withdrawal.id, 
        bulkAction, 
        bulkAction === 'rejected' ? 'Bulk rejection' : ''
      );
      
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    setRefreshing(false);
    setBulkSelection([]);
    setBulkAction('');
    setShowBulkActionModal(false);

    if (successCount > 0) {
      toast.success(`Successfully ${bulkAction}ed ${successCount} withdrawal${successCount !== 1 ? 's' : ''}`);
    }
    if (failedCount > 0) {
      toast.error(`Failed to ${bulkAction} ${failedCount} withdrawal${failedCount !== 1 ? 's' : ''}`);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredWithdrawals.map(withdrawal => ({
      'Request ID': withdrawal.requestId,
      'Creator': withdrawal.creatorName,
      'Amount': formatCurrency(withdrawal.amount),
      'Status': withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1),
      'Method': withdrawal.method === 'paypal' ? 'PayPal' : 'Bank Transfer',
      'Requested At': withdrawal.requestedAt 
        ? formatDate(withdrawal.requestedAt, 'datetime')
        : 'N/A',
      'Processed At': withdrawal.processedAt 
        ? formatDate(withdrawal.processedAt, 'datetime')
        : 'N/A',
      'Processed By': withdrawal.processedBy || 'N/A',
      'Rejection Reason': withdrawal.rejectionReason || 'N/A',
      'Receipt URL': withdrawal.receiptUrl || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Withdrawals');
    XLSX.writeFile(wb, `evernet-withdrawals-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data exported successfully');
  };

  const handleToggleBulkSelection = (withdrawalId) => {
    setBulkSelection(prev => 
      prev.includes(withdrawalId) 
        ? prev.filter(id => id !== withdrawalId)
        : [...prev, withdrawalId]
    );
  };

  const handleSelectAll = () => {
    if (bulkSelection.length === currentWithdrawals.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(currentWithdrawals.map(w => w.id));
    }
  };

  const viewWithdrawalDetails = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailsModal(true);
  };

  const initiateApprove = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowApproveModal(true);
  };

  const initiateReject = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3" />;
      case 'rejected':
        return <XCircle className="h-3 w-3" />;
      case 'processing':
        return <RefreshCw className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'paypal':
        return <CreditCard className="h-4 w-4" />;
      case 'bank':
        return <Banknote className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWithdrawals = filteredWithdrawals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);

  const statsCardsData = [
    {
      title: 'Total Withdrawals',
      value: stats.totalWithdrawals,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-blue-500',
      change: null
    },
    {
      title: 'Pending',
      value: stats.pendingWithdrawals,
      icon: <Clock className="h-6 w-6" />,
      color: 'bg-yellow-500',
      change: null
    },
    {
      title: 'Pending Amount',
      value: formatCurrency(stats.totalPendingAmount),
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'bg-amber-500',
      change: null
    },
    {
      title: 'Total Approved',
      value: formatCurrency(stats.totalApprovedAmount),
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'bg-green-500',
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
            <h1 className="text-2xl font-bold text-gray-900">Withdrawals Management</h1>
            <p className="text-gray-600">Review and approve creator withdrawal requests</p>
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
                onClick={() => setShowBulkActionModal(true)}
                className="btn-primary flex items-center gap-2"
                disabled={bulkSelection.filter(id => {
                  const withdrawal = withdrawals.find(w => w.id === id);
                  return withdrawal && withdrawal.status === 'pending';
                }).length === 0}
              >
                <Send className="h-4 w-4" />
                Bulk Action ({bulkSelection.length})
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
                  {bulkSelection.length} withdrawal{bulkSelection.length !== 1 ? 's' : ''} selected
                </span>
                <div className="text-sm text-gray-600">
                  {bulkSelection.filter(id => {
                    const withdrawal = withdrawals.find(w => w.id === id);
                    return withdrawal && withdrawal.status === 'pending';
                  }).length} pending
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Total: {formatCurrency(
                    bulkSelection
                      .filter(id => {
                        const withdrawal = withdrawals.find(w => w.id === id);
                        return withdrawal && withdrawal.status === 'pending';
                      })
                      .reduce((sum, id) => {
                        const withdrawal = withdrawals.find(w => w.id === id);
                        return sum + (withdrawal?.amount || 0);
                      }, 0)
                  )}
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
                placeholder="Search withdrawals..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="processing">Processing</option>
            </select>

            {/* Method Filter */}
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Methods</option>
              <option value="paypal">PayPal</option>
              <option value="bank">Bank Transfer</option>
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

            {/* Date Range Filter */}
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
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

            {/* Show Only Pending */}
            <button
              onClick={() => handleFilterChange('status', 'pending')}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Show Pending Only ({stats.pendingWithdrawals})
            </button>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setFilters({
                  status: 'all',
                  method: 'all',
                  minAmount: '',
                  maxAmount: '',
                  creatorId: 'all',
                  dateRange: 'all'
                });
                setSearchTerm('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={bulkSelection.length === currentWithdrawals.length && currentWithdrawals.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('requestedAt')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortConfig.key === 'requestedAt' && (
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
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center gap-1">
                      Amount
                      {sortConfig.key === 'amount' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('method')}
                  >
                    <div className="flex items-center gap-1">
                      Method
                      {sortConfig.key === 'method' && (
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentWithdrawals.map((withdrawal) => {
                  const isPending = withdrawal.status === 'pending';
                  const canApprove = isPending && (withdrawal.amount <= (withdrawal.creatorAvailableBalance || 0));
                  
                  return (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={bulkSelection.includes(withdrawal.id)}
                          onChange={() => handleToggleBulkSelection(withdrawal.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={!isPending}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {withdrawal.requestedAt 
                            ? formatDate(withdrawal.requestedAt, 'short')
                            : 'N/A'
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {withdrawal.processedAt 
                            ? `Processed: ${formatDate(withdrawal.processedAt, 'short')}`
                            : 'Not processed'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {withdrawal.creatorName?.charAt(0) || 'C'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {withdrawal.creatorName || 'Unknown Creator'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {withdrawal.creatorEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(withdrawal.amount)}
                        </div>
                        {isPending && (
                          <div className={`text-xs ${canApprove ? 'text-green-600' : 'text-red-600'}`}>
                            Balance: {formatCurrency(withdrawal.creatorAvailableBalance || 0)}
                            {!canApprove && ' (Insufficient)'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(withdrawal.method)}
                          <span className="text-sm text-gray-900">
                            {withdrawal.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)}
                          <span className="ml-1">
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </span>
                        </span>
                        {withdrawal.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1 truncate max-w-xs">
                            Reason: {withdrawal.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {withdrawal.requestId || withdrawal.id}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewWithdrawalDetails(withdrawal)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isPending && canApprove && (
                            <>
                              <button
                                onClick={() => initiateApprove(withdrawal)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => initiateReject(withdrawal)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {isPending && !canApprove && (
                            <span className="text-red-500 p-1" title="Creator has insufficient balance">
                              <AlertTriangle className="h-4 w-4" />
                            </span>
                          )}
                          {withdrawal.receiptUrl && (
                            <a
                              href={withdrawal.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                              title="View Receipt"
                            >
                              <Receipt className="h-4 w-4" />
                            </a>
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
                    {Math.min(indexOfLastItem, filteredWithdrawals.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredWithdrawals.length}</span> withdrawals
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

      {/* Withdrawal Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Withdrawal Request Details
                    </h2>
                    <p className="text-gray-600">
                      {selectedWithdrawal.creatorName} • {formatDate(selectedWithdrawal.requestedAt, 'long')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedWithdrawal.status)}`}>
                    {getStatusIcon(selectedWithdrawal.status)}
                    <span className="ml-1">
                      {selectedWithdrawal.status.charAt(0).toUpperCase() + selectedWithdrawal.status.slice(1)}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Request Summary */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Request Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Request ID</span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {selectedWithdrawal.requestId || selectedWithdrawal.id}
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Creator</span>
                        <div className="text-right">
                          <div className="font-medium">{selectedWithdrawal.creatorName}</div>
                          <div className="text-sm text-gray-500">{selectedWithdrawal.creatorEmail}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Amount</span>
                        <span className="font-bold text-xl text-gray-900">
                          {formatCurrency(selectedWithdrawal.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Method</span>
                        <div className="flex items-center gap-2">
                          {getMethodIcon(selectedWithdrawal.method)}
                          <span className="font-medium">
                            {selectedWithdrawal.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Requested At</span>
                        <span>{formatDate(selectedWithdrawal.requestedAt, 'datetime')}</span>
                      </div>
                      {selectedWithdrawal.processedAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Processed At</span>
                          <span>{formatDate(selectedWithdrawal.processedAt, 'datetime')}</span>
                        </div>
                      )}
                      {selectedWithdrawal.processedBy && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Processed By</span>
                          <span>Admin</span>
                        </div>
                      )}
                      {selectedWithdrawal.rejectionReason && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-600">Rejection Reason</span>
                          <div className="text-right">
                            <div className="font-medium text-red-600">{selectedWithdrawal.rejectionReason}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Creator Balance Info */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Creator Balance Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Available Balance</div>
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(selectedWithdrawal.creatorAvailableBalance || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Withdrawal Amount</div>
                          <div className="text-lg font-semibold">
                            {formatCurrency(selectedWithdrawal.amount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Remaining After</div>
                          <div className={`text-lg font-semibold ${
                            (selectedWithdrawal.creatorAvailableBalance || 0) - selectedWithdrawal.amount >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {formatCurrency((selectedWithdrawal.creatorAvailableBalance || 0) - selectedWithdrawal.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Section */}
                  {selectedWithdrawal.receiptUrl && (
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Payment Receipt</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Receipt className="h-8 w-8 text-gray-400" />
                            <div>
                              <div className="font-medium">Receipt Available</div>
                              <div className="text-sm text-gray-500">
                                Payment confirmation document
                              </div>
                            </div>
                          </div>
                          <a
                            href={selectedWithdrawal.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Receipt
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {selectedWithdrawal.status === 'pending' && (
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                      <div className="flex flex-wrap gap-3">
                        {(selectedWithdrawal.creatorAvailableBalance || 0) >= selectedWithdrawal.amount ? (
                          <>
                            <button
                              onClick={() => {
                                setShowDetailsModal(false);
                                initiateApprove(selectedWithdrawal);
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve Withdrawal
                            </button>
                            <button
                              onClick={() => {
                                setShowDetailsModal(false);
                                initiateReject(selectedWithdrawal);
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject Withdrawal
                            </button>
                          </>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <div>
                                <div className="font-medium text-red-800">Insufficient Balance</div>
                                <div className="text-sm text-red-700">
                                  Creator has insufficient available balance to process this withdrawal.
                                  Available: {formatCurrency(selectedWithdrawal.creatorAvailableBalance || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve Withdrawal Modal */}
      <AnimatePresence>
        {showApproveModal && selectedWithdrawal && (
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
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Approve Withdrawal</h2>
                    <p className="text-gray-600">Confirm payment to creator</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Creator:</span>
                        <span className="font-medium">{selectedWithdrawal.creatorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(selectedWithdrawal.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Method:</span>
                        <span>
                          {selectedWithdrawal.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New Balance:</span>
                        <span className={`font-medium ${
                          (selectedWithdrawal.creatorAvailableBalance || 0) - selectedWithdrawal.amount >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {formatCurrency((selectedWithdrawal.creatorAvailableBalance || 0) - selectedWithdrawal.amount)}
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
                          This will transfer {formatCurrency(selectedWithdrawal.amount)} to the creator's {selectedWithdrawal.method === 'paypal' ? 'PayPal account' : 'bank account'}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedWithdrawal.method === 'paypal' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-800">PayPal Processing</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Funds will be sent to the creator's PayPal email. Ensure you have the PayPal receipt ready.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWithdrawal.method === 'bank' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Banknote className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-800">Bank Transfer</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Transfer will be processed via bank transfer (USA only). Processing may take 1-3 business days.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowApproveModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleProcessWithdrawal(selectedWithdrawal.id, 'approved');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Approval
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Withdrawal Modal */}
      <AnimatePresence>
        {showRejectModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Reject Withdrawal</h2>
                    <p className="text-gray-600">Provide a reason for rejection</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Creator:</span>
                        <span className="font-medium">{selectedWithdrawal.creatorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(selectedWithdrawal.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rejection *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full h-32 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Explain why this withdrawal is being rejected..."
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      This reason will be visible to the creator.
                    </p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800">Important</h4>
                        <p className="text-sm text-red-700 mt-1">
                          Rejecting this withdrawal will keep the funds in the creator's available balance. 
                          The creator can submit a new withdrawal request.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!rejectionReason.trim()) {
                        toast.error('Please provide a reason for rejection');
                        return;
                      }
                      await handleProcessWithdrawal(selectedWithdrawal.id, 'rejected', rejectionReason);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    disabled={!rejectionReason.trim()}
                  >
                    <XCircle className="h-4 w-4" />
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Action Modal */}
      <AnimatePresence>
        {showBulkActionModal && bulkSelection.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Bulk Action</h2>
                    <p className="text-gray-600">Process multiple withdrawals</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selected Withdrawals:</span>
                        <span className="font-medium">{bulkSelection.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Eligible to Process:</span>
                        <span className="font-medium">
                          {bulkSelection.filter(id => {
                            const withdrawal = withdrawals.find(w => w.id === id);
                            return withdrawal && withdrawal.status === 'pending';
                          }).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatCurrency(
                            bulkSelection
                              .filter(id => {
                                const withdrawal = withdrawals.find(w => w.id === id);
                                return withdrawal && withdrawal.status === 'pending';
                              })
                              .reduce((sum, id) => {
                                const withdrawal = withdrawals.find(w => w.id === id);
                                return sum + (withdrawal?.amount || 0);
                              }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Action *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setBulkAction('approved')}
                        className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 ${
                          bulkAction === 'approved'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                        }`}
                      >
                        <CheckCircle className={`h-6 w-6 ${
                          bulkAction === 'approved' ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <span className="font-medium">Approve All</span>
                      </button>
                      <button
                        onClick={() => setBulkAction('rejected')}
                        className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 ${
                          bulkAction === 'rejected'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-red-500 hover:bg-red-50'
                        }`}
                      >
                        <XCircle className={`h-6 w-6 ${
                          bulkAction === 'rejected' ? 'text-red-600' : 'text-gray-400'
                        }`} />
                        <span className="font-medium">Reject All</span>
                      </button>
                    </div>
                  </div>

                  {bulkAction && (
                    <div className={`${
                      bulkAction === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    } border rounded-lg p-4`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                          bulkAction === 'approved' ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <div>
                          <h4 className={`font-medium ${
                            bulkAction === 'approved' ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {bulkAction === 'approved' ? 'Approval Notice' : 'Rejection Notice'}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            bulkAction === 'approved' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {bulkAction === 'approved' 
                              ? 'This will approve all eligible withdrawals and transfer funds to creators.'
                              : 'This will reject all eligible withdrawals. Creators will need to submit new requests.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {bulkSelection.length > 10 && bulkAction && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">Large Batch</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Processing {bulkSelection.filter(id => {
                              const withdrawal = withdrawals.find(w => w.id === id);
                              return withdrawal && withdrawal.status === 'pending';
                            }).length} withdrawals may take a moment. Please do not close this window.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowBulkActionModal(false);
                      setBulkAction('');
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction || refreshing}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      bulkAction === 'approved'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white disabled:opacity-50`}
                  >
                    {refreshing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {bulkAction === 'approved' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {bulkAction === 'approved' ? 'Approve All' : 'Reject All'}
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

export default Withdrawals;
