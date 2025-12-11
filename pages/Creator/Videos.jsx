import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/shared/Layout/CreatorLayout';
import { 
  Video, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  BarChart3,
  ExternalLink,
  Clock,
  Play,
  Users,
  ChevronDown,
  ChevronUp,
  Link
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate, formatViews } from '../../utils/formatters';
import { FINANCIAL_CONSTANTS } from '../../utils/constants';

const CreatorVideos = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'lastScanned',
    sortDirection: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newVideo, setNewVideo] = useState({
    youtubeUrl: '',
    title: '',
    scanFrequency: 'daily',
    premiumPercentage: FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE
  });
  const [editForm, setEditForm] = useState({});
  const [videoStats, setVideoStats] = useState({
    totalVideos: 0,
    activeVideos: 0,
    totalViews: 0,
    totalPremiumViews: 0,
    totalEarnings: 0,
    monthlyEarnings: 0
  });

  // Fetch videos on component mount
  useEffect(() => {
    if (currentUser) {
      fetchVideos();
    }
  }, [currentUser]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...videos];

    // Apply search
    if (searchTerm) {
      result = result.filter(video =>
        video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.youtubeUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.videoId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter(video => 
        filters.status === 'active' ? video.isActive : !video.isActive
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[filters.sortBy];
      let bValue = b[filters.sortBy];

      // Handle dates
      if (filters.sortBy.includes('Scanned') || filters.sortBy.includes('At')) {
        aValue = aValue?.toDate ? aValue.toDate() : new Date(aValue);
        bValue = bValue?.toDate ? bValue.toDate() : new Date(bValue);
      }

      if (aValue < bValue) {
        return filters.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return filters.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredVideos(result);
    setCurrentPage(1);
  }, [videos, searchTerm, filters]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      if (!currentUser?.uid) return;

      const videosRef = collection(db, 'scanned_videos');
      const q = query(
        videosRef,
        where('creatorId', '==', currentUser.uid),
        orderBy('lastScanned', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const videosList = [];
      let totalViews = 0;
      let totalPremiumViews = 0;
      let totalEarnings = 0;
      let monthlyEarnings = 0;
      let activeVideos = 0;

      querySnapshot.forEach((doc) => {
        const video = { id: doc.id, ...doc.data() };
        videosList.push(video);
        
        totalViews += video.totalYouTubeViews || 0;
        totalPremiumViews += video.totalPremiumViews || 0;
        totalEarnings += video.totalEarnings || 0;
        monthlyEarnings += video.currentMonthEarnings || 0;
        
        if (video.isActive) {
          activeVideos++;
        }
      });

      setVideos(videosList);
      setFilteredVideos(videosList);
      setVideoStats({
        totalVideos: videosList.length,
        activeVideos,
        totalViews,
        totalPremiumViews,
        totalEarnings,
        monthlyEarnings
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (sortBy) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortDirection: prev.sortBy === sortBy && prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddVideo = async () => {
    try {
      // Validate YouTube URL
      const youtubeUrl = newVideo.youtubeUrl.trim();
      if (!youtubeUrl) {
        toast.error('Please enter a YouTube URL');
        return;
      }

      // Extract video ID from URL
      let videoId;
      try {
        const url = new URL(youtubeUrl);
        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
          if (url.hostname.includes('youtu.be')) {
            videoId = url.pathname.slice(1);
          } else {
            videoId = url.searchParams.get('v');
          }
        }
      } catch (error) {
        toast.error('Invalid YouTube URL');
        return;
      }

      if (!videoId) {
        toast.error('Could not extract video ID from URL');
        return;
      }

      // Check if video already exists
      const existingVideo = videos.find(v => v.videoId === videoId);
      if (existingVideo) {
        toast.error('This video is already in your list');
        return;
      }

      // In a real app, you would:
      // 1. Validate the video exists via YouTube API
      // 2. Fetch video details (title, thumbnail, etc.)
      // 3. Add to scanned_videos collection
      
      // For now, simulate adding a video
      const videoData = {
        videoId,
        youtubeUrl,
        title: newVideo.title || `Video ${videos.length + 1}`,
        creatorId: currentUser.uid,
        totalYouTubeViews: 0,
        totalEverNetViews: 0,
        totalPremiumViews: 0,
        currentMonthEarnings: 0,
        totalEarnings: 0,
        premiumPercentage: newVideo.premiumPercentage || FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE,
        scanFrequency: newVideo.scanFrequency || 'daily',
        isActive: true,
        lastScanned: serverTimestamp(),
        addedAt: serverTimestamp()
      };

      // Simulate adding to Firestore
      // const docRef = await addDoc(collection(db, 'scanned_videos'), videoData);
      
      const newVideoWithId = {
        id: `video_${Date.now()}`,
        ...videoData
      };

      setVideos(prev => [newVideoWithId, ...prev]);
      setNewVideo({
        youtubeUrl: '',
        title: '',
        scanFrequency: 'daily',
        premiumPercentage: FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE
      });
      setShowAddModal(false);
      toast.success('Video added successfully! It will be scanned soon.');
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to add video');
    }
  };

  const handleUpdateVideo = async (videoId, updates) => {
    try {
      const videoRef = doc(db, 'scanned_videos', videoId);
      await updateDoc(videoRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, ...updates } : v
      ));
      
      toast.success('Video updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      const videoRef = doc(db, 'scanned_videos', videoId);
      await updateDoc(videoRef, {
        isActive: false,
        deletedAt: serverTimestamp()
      });

      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, isActive: false } : v
      ));
      
      toast.success('Video deactivated successfully');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVideos();
    setRefreshing(false);
    toast.success('Videos refreshed!');
  };

  const viewVideoDetails = (video) => {
    setSelectedVideo(video);
    setShowDetailsModal(true);
  };

  const editVideo = (video) => {
    setSelectedVideo(video);
    setEditForm({
      title: video.title,
      premiumPercentage: video.premiumPercentage,
      scanFrequency: video.scanFrequency,
      isActive: video.isActive
    });
    setShowEditModal(true);
  };

  const confirmDelete = (video) => {
    setSelectedVideo(video);
    setShowDeleteModal(true);
  };

  const extractYouTubeThumbnail = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  const getVideoIdFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
      return urlObj.searchParams.get('v');
    } catch (error) {
      return null;
    }
  };

  const statsCards = [
    {
      title: 'Total Videos',
      value: videoStats.totalVideos,
      icon: <Video className="h-6 w-6" />,
      color: 'bg-blue-500',
      description: `${videoStats.activeVideos} active`,
      change: '+2 this month'
    },
    {
      title: 'Total Views',
      value: formatViews(videoStats.totalViews),
      icon: <Eye className="h-6 w-6" />,
      color: 'bg-purple-500',
      description: `${formatViews(videoStats.totalPremiumViews)} premium`,
      change: '+12% from last month'
    },
    {
      title: 'Total Earnings',
      value: formatCurrency(videoStats.totalEarnings),
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-green-500',
      description: `${formatCurrency(videoStats.monthlyEarnings)} this month`,
      change: '+8% from last month'
    },
    {
      title: 'Premium Rate',
      value: videoStats.totalViews > 0 
        ? `${((videoStats.totalPremiumViews / videoStats.totalViews) * 100).toFixed(1)}%`
        : '0%',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-amber-500',
      description: `Target: ${FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}%`,
      change: videoStats.totalViews > 0 
        ? `${(((videoStats.totalPremiumViews / videoStats.totalViews) * 100) - FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE).toFixed(1)}% vs target`
        : 'No data'
    }
  ];

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVideos = filteredVideos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);

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
            <h1 className="text-2xl font-bold text-gray-900">Video Management</h1>
            <p className="text-gray-600">Manage your YouTube videos and track earnings</p>
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
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Video
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
                <p className="text-xs text-gray-600">{stat.change}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search videos..."
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
              <option value="all">All Videos</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Sort By */}
            <select
              value={filters.sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="lastScanned">Last Scanned</option>
              <option value="title">Title</option>
              <option value="totalYouTubeViews">Total Views</option>
              <option value="currentMonthEarnings">Monthly Earnings</option>
              <option value="addedAt">Date Added</option>
            </select>

            {/* Sort Direction */}
            <select
              value={filters.sortDirection}
              onChange={(e) => handleFilterChange('sortDirection', e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentVideos.length > 0 ? (
            currentVideos.map((video) => {
              const videoId = getVideoIdFromUrl(video.youtubeUrl) || video.videoId;
              const thumbnailUrl = videoId ? extractYouTubeThumbnail(videoId) : null;
              
              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gray-200">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                        <Play className="h-12 w-12 text-white opacity-50" />
                      </div>
                    )}
                    {!video.isActive && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
                          Inactive
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        video.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {video.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate mb-1">
                      {video.title || 'Untitled Video'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Link className="h-3 w-3" />
                      <span className="truncate">{video.youtubeUrl}</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Views</div>
                        <div className="font-medium text-gray-900">
                          {formatViews(video.totalYouTubeViews || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Earnings</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(video.totalEarnings || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">This Month</div>
                        <div className="font-medium text-blue-600">
                          {formatCurrency(video.currentMonthEarnings || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Premium</div>
                        <div className="font-medium text-amber-600">
                          {video.premiumPercentage}%
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewVideoDetails(video)}
                        className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Details
                      </button>
                      <button
                        onClick={() => editVideo(video)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        title="Edit"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => confirmDelete(video)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        title={video.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {video.isActive ? (
                          <Trash2 className="h-3 w-3" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Videos Found</h3>
              <p className="text-gray-600 mb-4">
                {videos.length === 0 
                  ? "You haven't added any YouTube videos yet. Add your first video to start earning!"
                  : "Try adjusting your search or filters"
                }
              </p>
              {videos.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Video
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredVideos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredVideos.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredVideos.length}</span> videos
                </div>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="8">8 per page</option>
                  <option value="12">12 per page</option>
                  <option value="16">16 per page</option>
                  <option value="20">20 per page</option>
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
        )}

        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Video Earnings Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-900">1. Add All Your Videos</div>
                  <div className="text-sm text-gray-600">Add every YouTube video to maximize your earnings potential.</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-900">2. Keep Videos Active</div>
                  <div className="text-sm text-gray-600">Active videos are scanned daily for new views and earnings.</div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-sm text-gray-900">3. Monitor Performance</div>
                  <div className="text-sm text-gray-600">Check which videos perform best and optimize your content.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Video Modal */}
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
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add New Video</h2>
                    <p className="text-gray-600">Add a YouTube video to start earning</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      YouTube URL *
                    </label>
                    <input
                      type="url"
                      value={newVideo.youtubeUrl}
                      onChange={(e) => setNewVideo({ ...newVideo, youtubeUrl: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste the full YouTube video URL
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter a custom title or leave blank"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scan Frequency
                      </label>
                      <select
                        value={newVideo.scanFrequency}
                        onChange={(e) => setNewVideo({ ...newVideo, scanFrequency: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Premium %
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.1"
                        value={newVideo.premiumPercentage}
                        onChange={(e) => setNewVideo({ ...newVideo, premiumPercentage: parseFloat(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Default: {FINANCIAL_CONSTANTS.PREMIUM_PERCENTAGE}%
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">How It Works</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          After adding a video, our system will scan it daily for new views.
                          Earnings are calculated based on premium views (7% of total views).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddVideo}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Video
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Video Modal */}
      <AnimatePresence>
        {showEditModal && selectedVideo && (
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
                    <Edit className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Edit Video</h2>
                    <p className="text-gray-600">Update video settings</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video Title
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scan Frequency
                      </label>
                      <select
                        value={editForm.scanFrequency}
                        onChange={(e) => setEditForm({ ...editForm, scanFrequency: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Premium %
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.1"
                        value={editForm.premiumPercentage}
                        onChange={(e) => setEditForm({ ...editForm, premiumPercentage: parseFloat(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Active (video will be scanned)</span>
                    </label>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Note</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Changing premium percentage only affects future scans, not historical data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateVideo(selectedVideo.id, editForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete/Deactivate Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    selectedVideo.isActive ? 'bg-red-100' : 'bg-green-100'
                  }`}>
                    {selectedVideo.isActive ? (
                      <Trash2 className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedVideo.isActive ? 'Deactivate Video' : 'Activate Video'}
                    </h2>
                    <p className="text-gray-600">
                      {selectedVideo.isActive 
                        ? 'Stop scanning this video' 
                        : 'Start scanning this video again'
                      }
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="font-medium text-gray-900">{selectedVideo.title}</div>
                      <div className="text-sm text-gray-600">{selectedVideo.youtubeUrl}</div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          Views: {formatViews(selectedVideo.totalYouTubeViews || 0)}
                        </span>
                        <span className="text-gray-600">
                          Earnings: {formatCurrency(selectedVideo.totalEarnings || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`${
                    selectedVideo.isActive ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  } border rounded-lg p-4`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className={`h-5 w-5 mt-0.5 ${
                        selectedVideo.isActive ? 'text-red-600' : 'text-green-600'
                      }`} />
                      <div>
                        <h4 className={`font-medium ${
                          selectedVideo.isActive ? 'text-red-800' : 'text-green-800'
                        }`}>
                          {selectedVideo.isActive ? 'Deactivation Notice' : 'Activation Notice'}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          selectedVideo.isActive ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {selectedVideo.isActive 
                            ? 'Deactivated videos will no longer be scanned for new views and earnings.'
                            : 'Activated videos will be scanned daily for new views and earnings.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(selectedVideo.id)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      selectedVideo.isActive
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {selectedVideo.isActive ? (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Deactivate Video
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Activate Video
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedVideo && (
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
                    <h2 className="text-xl font-bold text-gray-900">Video Details</h2>
                    <p className="text-gray-600">{selectedVideo.title}</p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedVideo.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedVideo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Video Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Video Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">YouTube URL:</span>
                        <a
                          href={selectedVideo.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          Open
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Video ID:</span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {selectedVideo.videoId}
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Scan Frequency:</span>
                        <span className="font-medium capitalize">{selectedVideo.scanFrequency}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Premium Percentage:</span>
                        <span className="font-medium">{selectedVideo.premiumPercentage}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Added:</span>
                        <span>{formatDate(selectedVideo.addedAt, 'long')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Last Scanned:</span>
                        <span>{formatDate(selectedVideo.lastScanned, 'long')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Performance Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total YouTube Views:</span>
                        <span className="font-bold text-lg text-gray-900">
                          {formatViews(selectedVideo.totalYouTubeViews || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Premium Views:</span>
                        <span className="font-bold text-lg text-amber-600">
                          {formatViews(selectedVideo.totalPremiumViews || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Premium Rate:</span>
                        <span className="font-medium">
                          {selectedVideo.totalYouTubeViews > 0 
                            ? `${((selectedVideo.totalPremiumViews / selectedVideo.totalYouTubeViews) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Current Month Earnings:</span>
                        <span className="font-bold text-lg text-green-600">
                          {formatCurrency(selectedVideo.currentMonthEarnings || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Earnings:</span>
                        <span className="font-bold text-xl text-green-600">
                          {formatCurrency(selectedVideo.totalEarnings || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earnings Calculation */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Calculation</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Premium Views</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatViews(selectedVideo.totalPremiumViews || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedVideo.premiumPercentage}% of total views
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">÷ 1000</div>
                        <div className="text-xl font-bold text-gray-900">
                          {((selectedVideo.totalPremiumViews || 0) / 1000).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">thousands of views</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">× Rate</div>
                        <div className="text-xl font-bold text-green-600">
                          {formatCurrency(((selectedVideo.totalPremiumViews || 0) / 1000) * FINANCIAL_CONSTANTS.PAYOUT_RATE_PER_1000)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(FINANCIAL_CONSTANTS.PAYOUT_RATE_PER_1000)} per 1000
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      editVideo(selectedVideo);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Video
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      confirmDelete(selectedVideo);
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      selectedVideo.isActive
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {selectedVideo.isActive ? (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <a
                    href={selectedVideo.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open on YouTube
                  </a>
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

export default CreatorVideos;
