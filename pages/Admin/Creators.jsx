import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/shared/Layout/AdminLayout';
import StatsCards from '../../components/shared/UI/StatsCards';
import { 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Eye, 
  UserPlus,
  UserCheck,
  UserX,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';

const Creators = () => {
  const { currentUser } = useAuth();
  const [creators, setCreators] = useState([]);
  const [filteredCreators, setFilteredCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    minEarnings: '',
    maxEarnings: '',
    dateJoined: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'totalEarnings', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCreator, setNewCreator] = useState({
    email: '',
    displayName: '',
    role: 'creator',
    status: 'active',
    paymentMethod: { type: 'paypal', paypalEmail: '' }
  });
  const [editForm, setEditForm] = useState({});
  const [bulkSelection, setBulkSelection] = useState([]);
  const [stats, setStats] = useState({
    totalCreators: 0,
    activeCreators: 0,
    suspendedCreators: 0,
    totalEarnings: 0,
    totalLocked: 0,
    totalAvailable: 0
  });

  // Fetch creators on component mount
  useEffect(() => {
    fetchCreators();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...creators];

    // Apply search
    if (searchTerm) {
      result = result.filter(creator =>
        creator.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      result = result.filter(creator => creator.status === filters.status);
    }

    if (filters.role !== 'all') {
      result = result.filter(creator => creator.role === filters.role);
    }

    if (filters.minEarnings) {
      result = result.filter(creator => 
        (creator.totalEarnings || 0) >= parseFloat(filters.minEarnings)
      );
    }

    if (filters.maxEarnings) {
      result = result.filter(creator => 
        (creator.totalEarnings || 0) <= parseFloat(filters.maxEarnings)
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested objects
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

    setFilteredCreators(result);
  }, [creators, searchTerm, filters, sortConfig]);

  // Calculate stats
  useEffect(() => {
    const statsData = {
      totalCreators: creators.length,
      activeCreators: creators.filter(c => c.status === 'active').length,
      suspendedCreators: creators.filter(c => c.status === 'suspended').length,
      totalEarnings: creators.reduce((sum, c) => sum + (c.totalEarnings || 0), 0),
      totalLocked: creators.reduce((sum, c) => sum + (c.lockedBalance || 0), 0),
      totalAvailable: creators.reduce((sum, c) => sum + (c.availableBalance || 0), 0)
    };
    setStats(statsData);
  }, [creators]);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const creatorsRef = collection(db, 'users');
      const q = query(creatorsRef, where('role', 'in', ['creator', 'admin']), orderBy('displayName'));
      const querySnapshot = await getDocs(q);
      
      const creatorsList = [];
      querySnapshot.forEach((doc) => {
        creatorsList.push({ id: doc.id, ...doc.data() });
      });

      setCreators(creatorsList);
      setFilteredCreators(creatorsList);
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
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

  const handleExportCSV = () => {
    const exportData = filteredCreators.map(creator => ({
      'Name': creator.displayName,
      'Email': creator.email,
      'Role': creator.role,
      'Status': creator.status,
      'Total Earnings': `$${(creator.totalEarnings || 0).toFixed(2)}`,
      'Locked Balance': `$${(creator.lockedBalance || 0).toFixed(2)}`,
      'Available Balance': `$${(creator.availableBalance || 0).toFixed(2)}`,
      'Total Withdrawn': `$${(creator.totalWithdrawn || 0).toFixed(2)}`,
      'Payment Method': creator.paymentMethod?.type || 'N/A',
      'Last Report Date': creator.lastReportDate?.toDate().toLocaleDateString() || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Creators');
    XLSX.writeFile(wb, `evernet-creators-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data exported successfully');
  };

  const handleUpdateCreator = async (creatorId, updates) => {
    try {
      const creatorRef = doc(db, 'users', creatorId);
      await updateDoc(creatorRef, updates);
      
      // Update local state
      setCreators(prev => prev.map(c => 
        c.id === creatorId ? { ...c, ...updates } : c
      ));
      
      toast.success('Creator updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating creator:', error);
      toast.error('Failed to update creator');
    }
  };

  const handleAddCreator = async () => {
    try {
      // Validate email
      if (!newCreator.email.includes('@')) {
        toast.error('Please enter a valid email');
        return;
      }

      // Check if creator already exists
      const existingCreator = creators.find(c => c.email === newCreator.email);
      if (existingCreator) {
        toast.error('Creator with this email already exists');
        return;
      }

      // In a real app, you would:
      // 1. Create user in Firebase Auth
      // 2. Create user document in Firestore
      // For now, we'll just add to local state for demo
      
      const creatorId = `creator_${Date.now()}`;
      const newCreatorData = {
        id: creatorId,
        uid: creatorId,
        email: newCreator.email,
        displayName: newCreator.displayName,
        role: newCreator.role,
        status: newCreator.status,
        totalEarnings: 0,
        lockedBalance: 0,
        availableBalance: 0,
        totalWithdrawn: 0,
        paymentMethod: newCreator.paymentMethod,
        createdAt: new Date().toISOString()
      };

      // Add to Firestore (simulated)
      // const docRef = await addDoc(collection(db, 'users'), newCreatorData);
      
      setCreators(prev => [...prev, newCreatorData]);
      setNewCreator({
        email: '',
        displayName: '',
        role: 'creator',
        status: 'active',
        paymentMethod: { type: 'paypal', paypalEmail: '' }
      });
      setShowAddModal(false);
      toast.success('Creator added successfully');
    } catch (error) {
      console.error('Error adding creator:', error);
      toast.error('Failed to add creator');
    }
  };

  const handleBulkAction = async (action) => {
    if (bulkSelection.length === 0) {
      toast.error('Please select creators first');
      return;
    }

    try {
      const batch = writeBatch(db);
      const updates = [];

      bulkSelection.forEach(creatorId => {
        const creatorRef = doc(db, 'users', creatorId);
        
        switch (action) {
          case 'activate':
            batch.update(creatorRef, { status: 'active' });
            updates.push({ id: creatorId, status: 'active' });
            break;
          case 'suspend':
            batch.update(creatorRef, { status: 'suspended' });
            updates.push({ id: creatorId, status: 'suspended' });
            break;
          case 'resetPassword':
            // In real app, send password reset email
            updates.push({ id: creatorId, action: 'password_reset_sent' });
            break;
        }
      });

      await batch.commit();
      
      // Update local state
      setCreators(prev => prev.map(creator => {
        const update = updates.find(u => u.id === creator.id);
        return update ? { ...creator, status: update.status } : creator;
      }));

      toast.success(`${bulkSelection.length} creators updated successfully`);
      setBulkSelection([]);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to update creators');
    }
  };

  const handleToggleBulkSelection = (creatorId) => {
    setBulkSelection(prev => 
      prev.includes(creatorId) 
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  const handleSelectAll = () => {
    if (bulkSelection.length === currentCreators.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(currentCreators.map(c => c.id));
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCreators = filteredCreators.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCreators.length / itemsPerPage);

  const viewCreatorDetails = (creator) => {
    setSelectedCreator(creator);
    setShowDetailsModal(true);
  };

  const editCreator = (creator) => {
    setSelectedCreator(creator);
    setEditForm({
      displayName: creator.displayName,
      status: creator.status,
      role: creator.role,
      paymentMethod: creator.paymentMethod || { type: 'paypal', paypalEmail: '' }
    });
    setShowEditModal(true);
  };

  const statsCardsData = [
    {
      title: 'Total Creators',
      value: stats.totalCreators,
      icon: <UserPlus className="h-6 w-6" />,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Active Creators',
      value: stats.activeCreators,
      icon: <UserCheck className="h-6 w-6" />,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Total Earnings',
      value: `$${stats.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-gold-500',
      change: '+15%'
    },
    {
      title: 'Available Balance',
      value: `$${stats.totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: <Calendar className="h-6 w-6" />,
      color: 'bg-purple-500',
      change: '+5%'
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
            <h1 className="text-2xl font-bold text-gray-900">Creators Management</h1>
            <p className="text-gray-600">Manage all creators, their earnings, and status</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Creator
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
                  {bulkSelection.length} creator{bulkSelection.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                  >
                    Activate Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('suspend')}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                  >
                    Suspend Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('resetPassword')}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                  >
                    Reset Passwords
                  </button>
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
                placeholder="Search creators..."
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
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Role Filter */}
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="creator">Creators</option>
              <option value="admin">Admins</option>
            </select>

            {/* Earnings Range */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min $"
                value={filters.minEarnings}
                onChange={(e) => handleFilterChange('minEarnings', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max $"
                value={filters.maxEarnings}
                onChange={(e) => handleFilterChange('maxEarnings', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setFilters({
                  status: 'all',
                  role: 'all',
                  minEarnings: '',
                  maxEarnings: '',
                  dateJoined: ''
                });
                setSearchTerm('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Creators Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={bulkSelection.length === currentCreators.length && currentCreators.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('displayName')}
                  >
                    <div className="flex items-center gap-1">
                      Creator
                      {sortConfig.key === 'displayName' && (
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
                    onClick={() => handleSort('totalEarnings')}
                  >
                    <div className="flex items-center gap-1">
                      Total Earnings
                      {sortConfig.key === 'totalEarnings' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lockedBalance')}
                  >
                    <div className="flex items-center gap-1">
                      Locked
                      {sortConfig.key === 'lockedBalance' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('availableBalance')}
                  >
                    <div className="flex items-center gap-1">
                      Available
                      {sortConfig.key === 'availableBalance' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCreators.map((creator) => (
                  <tr key={creator.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={bulkSelection.includes(creator.id)}
                        onChange={() => handleToggleBulkSelection(creator.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {creator.displayName?.charAt(0) || 'C'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {creator.displayName || 'Unnamed Creator'}
                          </div>
                          <div className="text-sm text-gray-500">{creator.email}</div>
                          {creator.role === 'admin' && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        creator.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {creator.status === 'active' ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            Suspended
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ${(creator.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${(creator.totalWithdrawn || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} withdrawn
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-amber-600">
                        ${(creator.lockedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ${(creator.availableBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {creator.lastReportDate 
                        ? new Date(creator.lastReportDate.seconds * 1000).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewCreatorDetails(creator)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => editCreator(creator)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                          title="Edit Creator"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Quick status toggle
                            handleUpdateCreator(creator.id, {
                              status: creator.status === 'active' ? 'suspended' : 'active'
                            });
                          }}
                          className={`p-1 rounded ${
                            creator.status === 'active'
                              ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                              : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                          }`}
                          title={creator.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          {creator.status === 'active' ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                    {Math.min(indexOfLastItem, filteredCreators.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredCreators.length}</span> creators
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

      {/* Add Creator Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Creator</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={newCreator.email}
                      onChange={(e) => setNewCreator({ ...newCreator, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="creator@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={newCreator.displayName}
                      onChange={(e) => setNewCreator({ ...newCreator, displayName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Creator Name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={newCreator.role}
                        onChange={(e) => setNewCreator({ ...newCreator, role: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="creator">Creator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={newCreator.status}
                        onChange={(e) => setNewCreator({ ...newCreator, status: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={newCreator.paymentMethod.type}
                      onChange={(e) => setNewCreator({
                        ...newCreator,
                        paymentMethod: { ...newCreator.paymentMethod, type: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="paypal">PayPal</option>
                      <option value="bank">Bank Transfer (USA only)</option>
                    </select>
                  </div>
                  {newCreator.paymentMethod.type === 'paypal' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PayPal Email
                      </label>
                      <input
                        type="email"
                        value={newCreator.paymentMethod.paypalEmail}
                        onChange={(e) => setNewCreator({
                          ...newCreator,
                          paymentMethod: { ...newCreator.paymentMethod, paypalEmail: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="paypal@example.com"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCreator}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Creator
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Creator Modal */}
      <AnimatePresence>
        {showEditModal && selectedCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Edit Creator: {selectedCreator.displayName}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="creator">Creator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={editForm.paymentMethod?.type}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        paymentMethod: { ...editForm.paymentMethod, type: e.target.value }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="paypal">PayPal</option>
                      <option value="bank">Bank Transfer (USA only)</option>
                    </select>
                  </div>
                  {editForm.paymentMethod?.type === 'paypal' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PayPal Email
                      </label>
                      <input
                        type="email"
                        value={editForm.paymentMethod?.paypalEmail || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          paymentMethod: { ...editForm.paymentMethod, paypalEmail: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  {editForm.paymentMethod?.type === 'bank' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={editForm.paymentMethod?.bankDetails?.bankName || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            paymentMethod: {
                              ...editForm.paymentMethod,
                              bankDetails: {
                                ...editForm.paymentMethod?.bankDetails,
                                bankName: e.target.value
                              }
                            }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={editForm.paymentMethod?.bankDetails?.accountNumber || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            paymentMethod: {
                              ...editForm.paymentMethod,
                              bankDetails: {
                                ...editForm.paymentMethod?.bankDetails,
                                accountNumber: e.target.value
                              }
                            }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Routing Number
                        </label>
                        <input
                          type="text"
                          value={editForm.paymentMethod?.bankDetails?.routingNumber || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            paymentMethod: {
                              ...editForm.paymentMethod,
                              bankDetails: {
                                ...editForm.paymentMethod?.bankDetails,
                                routingNumber: e.target.value
                              }
                            }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateCreator(selectedCreator.id, editForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creator Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedCreator && (
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
                      {selectedCreator.displayName}
                    </h2>
                    <p className="text-gray-600">{selectedCreator.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCreator.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedCreator.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Financial Overview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Earnings</span>
                        <span className="font-semibold">
                          ${(selectedCreator.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Available Balance</span>
                        <span className="font-semibold text-green-600">
                          ${(selectedCreator.availableBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Locked Balance (90-day)</span>
                        <span className="font-semibold text-amber-600">
                          ${(selectedCreator.lockedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Withdrawn</span>
                        <span className="font-semibold">
                          ${(selectedCreator.totalWithdrawn || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600 block text-sm">User ID</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedCreator.id}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-sm">Role</span>
                        <span className="font-medium">{selectedCreator.role}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block text-sm">Last Report</span>
                        <span>
                          {selectedCreator.lastReportDate 
                            ? new Date(selectedCreator.lastReportDate.seconds * 1000).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedCreator.paymentMethod ? (
                        <div>
                          <div className="font-medium mb-2">
                            Type: {selectedCreator.paymentMethod.type === 'paypal' ? 'PayPal' : 'Bank Transfer'}
                          </div>
                          {selectedCreator.paymentMethod.type === 'paypal' && (
                            <div className="text-gray-600">
                              PayPal Email: {selectedCreator.paymentMethod.paypalEmail}
                            </div>
                          )}
                          {selectedCreator.paymentMethod.type === 'bank' && selectedCreator.paymentMethod.bankDetails && (
                            <div className="space-y-1 text-gray-600">
                              <div>Bank: {selectedCreator.paymentMethod.bankDetails.bankName}</div>
                              <div>Account: ••••{selectedCreator.paymentMethod.bankDetails.accountNumber?.slice(-4)}</div>
                              <div>Routing: ••••{selectedCreator.paymentMethod.bankDetails.routingNumber?.slice(-4)}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">No payment method configured</div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          // View creator's videos
                          toast.success(`Redirecting to ${selectedCreator.displayName}'s videos`);
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        View Videos
                      </button>
                      <button
                        onClick={() => {
                          // View creator's reports
                          toast.success(`Redirecting to ${selectedCreator.displayName}'s reports`);
                        }}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                      >
                        View Reports
                      </button>
                      <button
                        onClick={() => {
                          // View withdrawal history
                          toast.success(`Redirecting to ${selectedCreator.displayName}'s withdrawals`);
                        }}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        View Withdrawals
                      </button>
                      <button
                        onClick={() => {
                          editCreator(selectedCreator);
                          setShowDetailsModal(false);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Edit Creator
                      </button>
                    </div>
                  </div>
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

export default Creators;
