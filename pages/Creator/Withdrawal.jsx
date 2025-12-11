import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/shared/Layout/CreatorLayout';
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Download,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Send,
  Receipt,
  PlusCircle,
  ExternalLink,
  ArrowUpRight,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FINANCIAL_CONSTANTS, PAYMENT_METHODS, WITHDRAWAL_STATUS } from '../../utils/constants';

const CreatorWithdrawals = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatorData, setCreatorData] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    year: 'all'
  });
  const [sortConfig, setSortConfig] = useState({ key: 'requestedAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    method: 'paypal',
    paypalEmail: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      accountHolderName: ''
    }
  });
  const [stats, setStats] = useState({
    availableBalance: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    pendingAmount: 0,
    approvedWithdrawals: 0,
    approvedAmount: 0,
    rejectedWithdrawals: 0,
    averageWithdrawal: 0
  });

  // Fetch data on component mount
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...withdrawals];

    // Apply search
    if (searchTerm) {
      result = result.filter(withdrawal =>
        withdrawal.requestId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.amount.toString().includes(searchTerm) ||
        withdrawal.method.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(withdrawal => withdrawal.status === filters.status);
    }

    if (filters.method !== 'all') {
      result = result.filter(withdrawal => withdrawal.method === filters.method);
    }

    if (filters.year !== 'all') {
      result = result.filter(withdrawal => {
        const year = withdrawal.requestedAt?.toDate 
          ? withdrawal.requestedAt.toDate().getFullYear().toString()
          : new Date(withdrawal.requestedAt).getFullYear().toString();
        return year === filters.year;
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle dates
        if (sortConfig.key.includes('At') && aValue?.toDate) {
          aValue = aValue.toDate();
          bValue = bValue.toDate();
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
    setCurrentPage(1);
  }, [withdrawals, searchTerm, filters, sortConfig]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCreatorData(),
        fetchWithdrawals(),
        calculateStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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
        
        // Pre-fill payment details in form
        if (data.paymentMethod) {
          setWithdrawalForm(prev => ({
            ...prev,
            method: data.paymentMethod.type || 'paypal',
            paypalEmail: data.paymentMethod.paypalEmail || '',
            bankDetails: data.paymentMethod.bankDetails || prev.bankDetails
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
      throw error;
    }
  };

  const fetchWithdrawals = async () => {
    try {
      if (!currentUser?.uid) return;

      const withdrawalsRef = collection(db, 'withdrawal_requests');
      const q = query(
        withdrawalsRef,
        where('creatorId', '==', currentUser.uid),
        orderBy('requestedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const withdrawalsList = [];
      
      querySnapshot.forEach((doc) => {
        withdrawalsList.push({ id: doc.id, ...doc.data() });
      });

      setWithdrawals(withdrawalsList);
      setFilteredWithdrawals(withdrawalsList);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      throw error;
    }
  };

  const calculateStats = () => {
    const availableBalance = creatorData?.availableBalance || 0;
    
    let totalWithdrawn = 0;
    let pendingWithdrawals = 0;
    let pendingAmount = 0;
    let approvedWithdrawals = 0;
    let approvedAmount = 0;
    let rejectedWithdrawals = 0;

    withdrawals.forEach(withdrawal => {
      if (withdrawal.status === 'approved') {
        approvedWithdrawals++;
        approvedAmount += withdrawal.amount || 0;
        totalWithdrawn += withdrawal.amount || 0;
      } else if (withdrawal.status === 'pending') {
        pendingWithdrawals++;
        pendingAmount += withdrawal.amount || 0;
      } else if (withdrawal.status === 'rejected') {
        rejectedWithdrawals++;
      }
    });

    const averageWithdrawal = approvedWithdrawals > 0 
      ? approvedAmount / approvedWithdrawals 
      : 0;

    setStats({
      availableBalance,
      totalWithdrawn,
      pendingWithdrawals,
      pendingAmount,
      approvedWithdrawals,
      approvedAmount,
      rejectedWithdrawals,
      averageWithdrawal
    });
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Data refreshed!');
  };

  const handleRequestWithdrawal = async () => {
    try {
      // Validate amount
      const amount = parseFloat(withdrawalForm.amount);
      
      if (!amount || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      if (amount < FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL) {
        toast.error(`Minimum withdrawal amount is ${formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}`);
        return;
      }

      if (amount > stats.availableBalance) {
        toast.error(`Insufficient balance. Available: ${formatCurrency(stats.availableBalance)}`);
        return;
      }

      // Validate payment method
      if (withdrawalForm.method === 'paypal' && !withdrawalForm.paypalEmail) {
        toast.error('Please enter your PayPal email');
        return;
      }

      if (withdrawalForm.method === 'bank') {
        const { bankName, accountNumber, routingNumber, accountHolderName } = withdrawalForm.bankDetails;
        if (!bankName || !accountNumber || !routingNumber || !accountHolderName) {
          toast.error('Please fill in all bank details');
          return;
        }
      }

      // Generate request ID
      const requestId = `WDR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Prepare withdrawal data
      const withdrawalData = {
        requestId,
        creatorId: currentUser.uid,
        amount: amount,
        method: withdrawalForm.method,
        status: 'pending',
        requestedAt: serverTimestamp(),
        paymentDetails: withdrawalForm.method === 'paypal' 
          ? { paypalEmail: withdrawalForm.paypalEmail }
          : { ...withdrawalForm.bankDetails },
        creatorAvailableBalance: stats.availableBalance
      };

      // Add withdrawal request
      const docRef = await addDoc(collection(db, 'withdrawal_requests'), withdrawalData);

      // Update local state
      const newWithdrawal = {
        id: docRef.id,
        ...withdrawalData
      };

      setWithdrawals(prev => [newWithdrawal, ...prev]);
      setStats(prev => ({
        ...prev,
        pendingWithdrawals: prev.pendingWithdrawals + 1,
        pendingAmount: prev.pendingAmount + amount
      }));

      // Reset form
      setWithdrawalForm({
        amount: '',
        method: creatorData?.paymentMethod?.type || 'paypal',
        paypalEmail: creatorData?.paymentMethod?.paypalEmail || '',
        bankDetails: creatorData?.paymentMethod?.bankDetails || {
          bankName: '',
          accountNumber: '',
          routingNumber: '',
          accountHolderName: ''
        }
      });

      setShowRequestModal(false);
      toast.success('Withdrawal request submitted successfully!');
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error('Failed to submit withdrawal request');
    }
  };

  const viewWithdrawalDetails = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailsModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
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

  const getYearsList = () => {
    const years = new Set();
    withdrawals.forEach(withdrawal => {
      if (withdrawal.requestedAt) {
        const year = withdrawal.requestedAt?.toDate 
          ? withdrawal.requestedAt.toDate().getFullYear()
          : new Date(withdrawal.requestedAt).getFullYear();
        years.add(year.toString());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWithdrawals = filteredWithdrawals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);

  const statsCards = [
    {
      title: 'Available Balance',
      value: formatCurrency(stats.availableBalance),
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-green-500',
      description: 'Ready to withdraw',
      action: stats.availableBalance >= FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL ? 'Request Withdrawal' : null
    },
    {
      title: 'Total Withdrawn',
      value: formatCurrency(stats.totalWithdrawn),
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-blue-500',
      description: `${stats.approvedWithdrawals} approved requests`,
      action: null
    },
    {
      title: 'Pending Requests',
      value: stats.pendingWithdrawals,
      icon: <Clock className="h-6 w-6" />,
      color: 'bg-yellow-500',
      description: formatCurrency(stats.pendingAmount),
      action: null
    },
    {
      title: 'Average Withdrawal',
      value: formatCurrency(stats.averageWithdrawal),
      icon: <AlertCircle className="h-6 w-6" />,
      color: 'bg-purple-500',
      description: 'Per approved request',
      action: null
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
            <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
            <p className="text-gray-600">Request payments and track withdrawal history</p>
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
              onClick={() => setShowRequestModal(true)}
              disabled={stats.availableBalance < FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              Request Withdrawal
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
              {stat.action && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    {stat.action}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Balance Warning */}
        {stats.availableBalance < FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800">Not Enough Balance</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You need at least {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)} to request a withdrawal.
                  Current available balance: {formatCurrency(stats.availableBalance)}
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  Keep adding videos and earning to reach the minimum amount!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Info */}
        {creatorData?.paymentMethod && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Payment Method</h3>
                  <p className="text-sm text-gray-600">
                    {creatorData.paymentMethod.type === 'paypal' 
                      ? `PayPal: ${creatorData.paymentMethod.paypalEmail}`
                      : `Bank Transfer: ${creatorData.paymentMethod.bankDetails?.bankName || 'Bank account'}`
                    }
                  </p>
                </div>
              </div>
              <a
                href="/creator/profile"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                Update
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setFilters({ status: 'all', method: 'all', year: 'all' });
                setSearchTerm('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                {currentWithdrawals.length > 0 ? (
                  currentWithdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
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
                            : 'Awaiting processing'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(withdrawal.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Balance: {formatCurrency(withdrawal.creatorAvailableBalance || 0)}
                        </div>
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
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                            {getStatusIcon(withdrawal.status)}
                            <span className="ml-1 capitalize">
                              {withdrawal.status}
                            </span>
                          </span>
                          {withdrawal.rejectionReason && (
                            <div className="text-xs text-red-600 truncate max-w-xs">
                              {withdrawal.rejectionReason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {withdrawal.requestId || withdrawal.id}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => viewWithdrawalDetails(withdrawal)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Banknote className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Withdrawals Yet</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          {withdrawals.length === 0 
                            ? "You haven't made any withdrawal requests yet. Request your first withdrawal when you reach the minimum amount."
                            : "No withdrawals match your current filters. Try adjusting your search criteria."
                          }
                        </p>
                        {withdrawals.length === 0 && stats.availableBalance >= FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL && (
                          <button
                            onClick={() => setShowRequestModal(true)}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Request Your First Withdrawal
                          </button>
                        )}
                      </div>
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

        {/* Process Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Withdrawal Process Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-900">1. Request Submission</div>
                  <div className="text-sm text-gray-600">Submit a withdrawal request with your preferred payment method.</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-900">2. Admin Review</div>
                  <div className="text-sm text-gray-600">Our team reviews and approves requests within 1-3 business days.</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-900">3. Payment Processing</div>
                  <div className="text-sm text-gray-600">PayPal transfers are instant, bank transfers take 1-3 business days.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Minimum Withdrawal */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Minimum Withdrawal</h3>
                <p className="text-sm text-gray-600">Required amount to request</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, (stats.availableBalance / FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>Current: {formatCurrency(stats.availableBalance)}</span>
                <span>Goal: {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}</span>
              </div>
            </div>
          </div>

          {/* Average Processing Time */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Processing Time</h3>
                <p className="text-sm text-gray-600">Average approval timeline</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              1-3 Days
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {stats.approvedWithdrawals > 0 
                ? `Based on ${stats.approvedWithdrawals} approved requests`
                : 'Estimated processing time'
              }
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Success Rate</h3>
                <p className="text-sm text-gray-600">Approved vs total requests</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {withdrawals.length > 0 
                ? `${Math.round((stats.approvedWithdrawals / withdrawals.length) * 100)}%`
                : '100%'
              }
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {stats.approvedWithdrawals} approved • {stats.rejectedWithdrawals} rejected • {stats.pendingWithdrawals} pending
            </div>
          </div>
        </div>
      </div>

      {/* Request Withdrawal Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Request Withdrawal</h2>
                    <p className="text-gray-600">Withdraw your available balance</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Available Balance */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Available Balance:</span>
                      <span className="font-bold text-lg text-gray-900">
                        {formatCurrency(stats.availableBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-600">Minimum Withdrawal:</span>
                      <span className="font-medium">
                        {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}
                      </span>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        value={withdrawalForm.amount}
                        onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                        min={FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL}
                        max={stats.availableBalance}
                        step="0.01"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setWithdrawalForm({ ...withdrawalForm, amount: (stats.availableBalance * 0.25).toFixed(2) })}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        25%
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawalForm({ ...withdrawalForm, amount: (stats.availableBalance * 0.5).toFixed(2) })}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawalForm({ ...withdrawalForm, amount: (stats.availableBalance * 0.75).toFixed(2) })}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        75%
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawalForm({ ...withdrawalForm, amount: stats.availableBalance.toFixed(2) })}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        100%
                      </button>
                    </div>
                    {withdrawalForm.amount && parseFloat(withdrawalForm.amount) < FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL && (
                      <p className="text-red-600 text-xs mt-1">
                        Minimum withdrawal is {formatCurrency(FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL)}
                      </p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setWithdrawalForm({ ...withdrawalForm, method: 'paypal' })}
                        className={`p-3 border-2 rounded-lg flex flex-col items-center justify-center gap-2 ${
                          withdrawalForm.method === 'paypal'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <CreditCard className={`h-5 w-5 ${
                          withdrawalForm.method === 'paypal' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <span className="font-medium">PayPal</span>
                        <span className="text-xs text-gray-500">Instant transfer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawalForm({ ...withdrawalForm, method: 'bank' })}
                        className={`p-3 border-2 rounded-lg flex flex-col items-center justify-center gap-2 ${
                          withdrawalForm.method === 'bank'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <Banknote className={`h-5 w-5 ${
                          withdrawalForm.method === 'bank' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <span className="font-medium">Bank Transfer</span>
                        <span className="text-xs text-gray-500">1-3 business days</span>
                      </button>
                    </div>
                  </div>

                  {/* PayPal Email */}
                  {withdrawalForm.method === 'paypal' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PayPal Email *
                      </label>
                      <input
                        type="email"
                        value={withdrawalForm.paypalEmail}
                        onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paypalEmail: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  )}

                  {/* Bank Details */}
                  {withdrawalForm.method === 'bank' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={withdrawalForm.bankDetails.bankName}
                          onChange={(e) => setWithdrawalForm({
                            ...withdrawalForm,
                            bankDetails: { ...withdrawalForm.bankDetails, bankName: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Chase Bank"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          value={withdrawalForm.bankDetails.accountHolderName}
                          onChange={(e) => setWithdrawalForm({
                            ...withdrawalForm,
                            bankDetails: { ...withdrawalForm.bankDetails, accountHolderName: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account Number *
                          </label>
                          <input
                            type="text"
                            value={withdrawalForm.bankDetails.accountNumber}
                            onChange={(e) => setWithdrawalForm({
                              ...withdrawalForm,
                              bankDetails: { ...withdrawalForm.bankDetails, accountNumber: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="123456789"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Routing Number *
                          </label>
                          <input
                            type="text"
                            value={withdrawalForm.bankDetails.routingNumber}
                            onChange={(e) => setWithdrawalForm({
                              ...withdrawalForm,
                              bankDetails: { ...withdrawalForm.bankDetails, routingNumber: e.target.value }
                            })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="021000021"
                          />
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-yellow-700">
                            Note: Bank transfers are only available for USA bank accounts. Transfers may take 1-3 business days to process.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Withdrawal Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Requested Amount:</span>
                        <span className="font-medium">
                          {withdrawalForm.amount ? formatCurrency(parseFloat(withdrawalForm.amount)) : '$0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium">
                          {withdrawalForm.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining Balance:</span>
                        <span className={`font-medium ${
                          stats.availableBalance - (parseFloat(withdrawalForm.amount) || 0) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(stats.availableBalance - (parseFloat(withdrawalForm.amount) || 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Important Notes */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Important Information</h4>
                        <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                          <li>• Withdrawal requests are reviewed within 1-3 business days</li>
                          <li>• Ensure your payment details are correct</li>
                          <li>• PayPal transfers are usually instant</li>
                          <li>• Bank transfers may take 1-3 business days</li>
                          <li>• You'll receive email confirmation when processed</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestWithdrawal}
                    disabled={!withdrawalForm.amount || parseFloat(withdrawalForm.amount) < FINANCIAL_CONSTANTS.MINIMUM_WITHDRAWAL}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                    Submit Request
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdrawal Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Withdrawal Details</h2>
                    <p className="text-gray-600">Request ID: {selectedWithdrawal.requestId || selectedWithdrawal.id}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedWithdrawal.status)}`}>
                    {getStatusIcon(selectedWithdrawal.status)}
                    <span className="ml-1 capitalize">{selectedWithdrawal.status}</span>
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Amount */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Requested Amount</div>
                      <div className="text-3xl font-bold text-gray-900 mt-1">
                        {formatCurrency(selectedWithdrawal.amount)}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Balance at request: {formatCurrency(selectedWithdrawal.creatorAvailableBalance || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Payment Method</h3>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {getMethodIcon(selectedWithdrawal.method)}
                      <div>
                        <div className="font-medium">
                          {selectedWithdrawal.method === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                        </div>
                        {selectedWithdrawal.method === 'paypal' && (
                          <div className="text-sm text-gray-600">
                            {selectedWithdrawal.paymentDetails?.paypalEmail || 'Email not specified'}
                          </div>
                        )}
                        {selectedWithdrawal.method === 'bank' && selectedWithdrawal.paymentDetails && (
                          <div className="text-sm text-gray-600">
                            {selectedWithdrawal.paymentDetails.bankName || 'Bank account'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Requested:</span>
                        <span>{formatDate(selectedWithdrawal.requestedAt, 'datetime')}</span>
                      </div>
                      {selectedWithdrawal.processedAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Processed:</span>
                          <span>{formatDate(selectedWithdrawal.processedAt, 'datetime')}</span>
                        </div>
                      )}
                      {selectedWithdrawal.receiptUrl && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Receipt:</span>
                          <a
                            href={selectedWithdrawal.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            View Receipt
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Details */}
                  {selectedWithdrawal.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-red-800">Rejection Reason</h4>
                          <p className="text-sm text-red-700 mt-1">{selectedWithdrawal.rejectionReason}</p>
                          <p className="text-xs text-red-600 mt-2">
                            You can submit a new withdrawal request with corrected information.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWithdrawal.status === 'pending' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-800">Pending Review</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Your withdrawal request is being reviewed by our team. This usually takes 1-3 business days.
                          </p>
                          <p className="text-xs text-blue-600 mt-2">
                            You'll receive an email notification once it's processed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWithdrawal.status === 'approved' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-green-800">Payment Approved</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your withdrawal has been approved and processed.
                            {selectedWithdrawal.method === 'paypal' 
                              ? ' Funds should be in your PayPal account.'
                              : ' Bank transfer may take 1-3 business days.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank Details (if applicable) */}
                  {selectedWithdrawal.method === 'bank' && selectedWithdrawal.paymentDetails && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Bank Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bank:</span>
                          <span>{selectedWithdrawal.paymentDetails.bankName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Account Holder:</span>
                          <span>{selectedWithdrawal.paymentDetails.accountHolderName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Account Number:</span>
                          <span>••••{selectedWithdrawal.paymentDetails.accountNumber?.slice(-4) || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Routing Number:</span>
                          <span>••••{selectedWithdrawal.paymentDetails.routingNumber?.slice(-4) || 'N/A'}</span>
                        </div>
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
    </Layout>
  );
};

export default CreatorWithdrawals;
