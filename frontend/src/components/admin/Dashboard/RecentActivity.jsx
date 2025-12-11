import React from 'react';
import { motion } from 'framer-motion';
import {
  FaUserPlus,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaVideo,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUserCheck,
  FaChartLine,
  FaShieldAlt,
  FaSync,
  FaBell,
  FaCreditCard,
  FaUserSlash
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const RecentActivity = ({ activities, loading, maxItems = 10 }) => {
  // Get activity icon based on type
  const getActivityIcon = (type) => {
    const iconMap = {
      'creator_joined': { icon: FaUserPlus, color: 'text-blue-500', bg: 'bg-blue-100' },
      'creator_approved': { icon: FaUserCheck, color: 'text-green-500', bg: 'bg-green-100' },
      'creator_suspended': { icon: FaUserSlash, color: 'text-red-500', bg: 'bg-red-100' },
      'withdrawal_requested': { icon: FaCreditCard, color: 'text-amber-500', bg: 'bg-amber-100' },
      'withdrawal_approved': { icon: FaMoneyBillWave, color: 'text-emerald-500', bg: 'bg-emerald-100' },
      'withdrawal_rejected': { icon: FaTimesCircle, color: 'text-red-500', bg: 'bg-red-100' },
      'report_generated': { icon: FaFileInvoiceDollar, color: 'text-purple-500', bg: 'bg-purple-100' },
      'report_unlocked': { icon: FaUnlock, color: 'text-teal-500', bg: 'bg-teal-100' },
      'video_added': { icon: FaVideo, color: 'text-indigo-500', bg: 'bg-indigo-100' },
      'video_removed': { icon: FaVideo, color: 'text-gray-500', bg: 'bg-gray-100' },
      'fraud_alert': { icon: FaExclamationTriangle, color: 'text-red-500', bg: 'bg-red-100' },
      'fraud_resolved': { icon: FaShieldAlt, color: 'text-green-500', bg: 'bg-green-100' },
      'scan_started': { icon: FaSync, color: 'text-blue-500', bg: 'bg-blue-100' },
      'scan_completed': { icon: FaCheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100' },
      'scan_failed': { icon: FaTimesCircle, color: 'text-red-500', bg: 'bg-red-100' },
      'notification_sent': { icon: FaBell, color: 'text-yellow-500', bg: 'bg-yellow-100' },
      'settings_updated': { icon: FaCog, color: 'text-gray-500', bg: 'bg-gray-100' },
      'login': { icon: FaSignInAlt, color: 'text-blue-500', bg: 'bg-blue-100' },
      'logout': { icon: FaSignOutAlt, color: 'text-gray-500', bg: 'bg-gray-100' }
    };
    return iconMap[type] || { icon: FaClock, color: 'text-gray-500', bg: 'bg-gray-100' };
  };

  // Get activity color based on type
  const getActivityColor = (type) => {
    const colorMap = {
      'creator_joined': 'border-l-blue-500',
      'creator_approved': 'border-l-green-500',
      'creator_suspended': 'border-l-red-500',
      'withdrawal_approved': 'border-l-emerald-500',
      'withdrawal_rejected': 'border-l-red-500',
      'report_generated': 'border-l-purple-500',
      'report_unlocked': 'border-l-teal-500',
      'fraud_alert': 'border-l-red-500',
      'scan_completed': 'border-l-emerald-500',
      'scan_failed': 'border-l-red-500',
      'default': 'border-l-gray-400'
    };
    return colorMap[type] || colorMap.default;
  };

  // Format activity message based on type and data
  const formatActivityMessage = (activity) => {
    const { type, data = {} } = activity;
    
    switch (type) {
      case 'creator_joined':
        return `New creator "${data.displayName}" joined the platform`;
      
      case 'creator_approved':
        return `Creator "${data.displayName}" was approved`;
      
      case 'creator_suspended':
        return `Creator "${data.displayName}" was suspended`;
      
      case 'withdrawal_requested':
        return `$${data.amount?.toFixed(2)} withdrawal requested by ${data.creatorName}`;
      
      case 'withdrawal_approved':
        return `$${data.amount?.toFixed(2)} withdrawal approved for ${data.creatorName}`;
      
      case 'withdrawal_rejected':
        return `$${data.amount?.toFixed(2)} withdrawal rejected for ${data.creatorName}`;
      
      case 'report_generated':
        return `Monthly report generated for ${data.month || 'current month'}`;
      
      case 'report_unlocked':
        return `Report unlocked: $${data.amount?.toFixed(2)} for ${data.creatorName}`;
      
      case 'video_added':
        return `Video "${data.videoTitle?.substring(0, 30)}..." added for scanning`;
      
      case 'video_removed':
        return `Video removed from scanning: ${data.videoId}`;
      
      case 'fraud_alert':
        return `Fraud alert detected: ${data.reason}`;
      
      case 'fraud_resolved':
        return `Fraud case resolved for ${data.creatorName}`;
      
      case 'scan_started':
        return `Scanner started processing ${data.videoCount || 'multiple'} videos`;
      
      case 'scan_completed':
        return `Scanner completed: ${data.newViews?.toLocaleString() || '0'} new views`;
      
      case 'scan_failed':
        return `Scanner failed: ${data.error?.substring(0, 50) || 'Unknown error'}`;
      
      case 'notification_sent':
        return `Notification sent to ${data.recipientCount || 'multiple'} creators`;
      
      case 'settings_updated':
        return `Platform settings updated by ${data.updatedBy}`;
      
      case 'login':
        return `User ${data.email} logged in`;
      
      case 'logout':
        return `User ${data.email} logged out`;
      
      default:
        return activity.message || 'Activity recorded';
    }
  };

  // Sample activities for demo
  const sampleActivities = [
    {
      id: 1,
      type: 'creator_joined',
      user: 'MusicPro Channel',
      data: { displayName: 'MusicPro Channel' },
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      severity: 'info'
    },
    {
      id: 2,
      type: 'withdrawal_approved',
      user: 'system',
      data: { amount: 250.00, creatorName: 'BeatMaker Official' },
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      severity: 'success'
    },
    {
      id: 3,
      type: 'report_generated',
      user: 'system',
      data: { month: 'January 2024' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      severity: 'info'
    },
    {
      id: 4,
      type: 'video_added',
      user: 'ElectroVibes',
      data: { 
        videoTitle: 'Summer Vibes 2024 - Official Music Video',
        videoId: 'abc123xyz'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      severity: 'info'
    },
    {
      id: 5,
      type: 'fraud_alert',
      user: 'system',
      data: { 
        reason: 'Unusual view pattern detected',
        videoId: 'xyz789abc'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      severity: 'warning'
    },
    {
      id: 6,
      type: 'scan_completed',
      user: 'system',
      data: { 
        newViews: 12500,
        videosScanned: 156,
        earnings: 37.50
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      severity: 'success'
    },
    {
      id: 7,
      type: 'withdrawal_requested',
      user: 'ChillHop Beats',
      data: { amount: 150.75, creatorName: 'ChillHop Beats' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
      severity: 'info'
    },
    {
      id: 8,
      type: 'settings_updated',
      user: 'admin@evernet.com',
      data: { updatedBy: 'System Admin' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
      severity: 'info'
    },
    {
      id: 9,
      type: 'creator_approved',
      user: 'admin@evernet.com',
      data: { displayName: 'Jazz Fusion Collective' },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18),
      severity: 'success'
    },
    {
      id: 10,
      type: 'report_unlocked',
      user: 'admin@evernet.com',
      data: { 
        amount: 420.50,
        creatorName: 'Rock Nation',
        reportId: 'rocknation_2024_01'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      severity: 'success'
    }
  ];

  // Use provided activities or sample data
  const displayActivities = activities?.length > 0 
    ? activities.slice(0, maxItems) 
    : sampleActivities.slice(0, maxItems);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-start space-x-4 animate-pulse">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-16 h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // No activities
  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaClock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
        <p className="text-gray-600 max-w-sm mx-auto">
          There hasn't been any activity on the platform recently.
          Activity will appear here as events occur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayActivities.map((activity, index) => {
        const { icon: Icon, color, bg } = getActivityIcon(activity.type);
        const borderColor = getActivityColor(activity.type);
        
        return (
          <motion.div
            key={activity.id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ x: 5 }}
            className={`relative bg-white rounded-lg border-l-4 ${borderColor} p-4 shadow-sm hover:shadow-md transition-all duration-200 group`}
          >
            {/* Main Content */}
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className={`${bg} p-2 rounded-full relative`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                  
                  {/* Severity indicator */}
                  {activity.severity === 'warning' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white"></div>
                  )}
                  {activity.severity === 'error' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Activity Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {formatActivityMessage(activity)}
                  </h4>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
                
                {/* Additional Info */}
                <div className="mt-1 flex items-center flex-wrap gap-2">
                  {activity.user && activity.user !== 'system' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <FaUserPlus className="h-3 w-3 mr-1" />
                      {activity.user}
                    </span>
                  )}
                  
                  {activity.data?.amount && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gold-primary/10 text-gold-dark">
                      <FaMoneyBillWave className="h-3 w-3 mr-1" />
                      ${activity.data.amount.toFixed(2)}
                    </span>
                  )}
                  
                  {activity.severity === 'warning' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <FaExclamationTriangle className="h-3 w-3 mr-1" />
                      Requires Attention
                    </span>
                  )}
                </div>
                
                {/* Action Buttons (Hover) */}
                <div className="mt-3 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button className="text-xs text-navy-primary hover:text-navy-dark font-medium">
                    View Details
                  </button>
                  <span className="text-gray-300">•</span>
                  <button className="text-xs text-gray-500 hover:text-gray-700">
                    Mark as Read
                  </button>
                  {activity.type.includes('fraud') && (
                    <>
                      <span className="text-gray-300">•</span>
                      <button className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                        Resolve
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center space-x-1">
                  <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Bar for Scans */}
            {(activity.type === 'scan_started' || activity.type === 'scan_completed') && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Scan Progress</span>
                  <span>{activity.type === 'scan_completed' ? '100%' : 'In Progress...'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      activity.type === 'scan_completed' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                    }`}
                    style={{ width: activity.type === 'scan_completed' ? '100%' : '65%' }}
                  ></div>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* View All Button */}
      {displayActivities.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="pt-4 border-t border-gray-200"
        >
          <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-navy-primary hover:text-navy-dark hover:bg-navy-primary/5 rounded-lg transition-colors">
            <span>View All Activity</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  );
};

// Export additional icons for use in parent components
export const ActivityIcons = {
  FaUserPlus,
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaVideo,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUserCheck,
  FaShieldAlt,
  FaSync,
  FaBell,
  FaCreditCard,
  FaUserSlash
};

export default RecentActivity;
