// Currency formatter
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Date formatter
export const formatDate = (timestamp, format = 'medium') => {
  if (!timestamp) return 'N/A';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'datetime':
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    default: // medium
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
  }
};

// Format video views
export const formatViews = (views) => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

// Format earnings for display
export const formatEarnings = (earnings) => {
  return {
    short: formatCurrency(earnings),
    full: formatCurrency(earnings),
    withChange: (earnings, previous) => {
      const change = previous ? ((earnings - previous) / previous) * 100 : 0;
      return {
        amount: formatCurrency(earnings),
        change: change.toFixed(1),
        isPositive: change >= 0
      };
    }
  };
};

// Format status badge
export const formatStatus = (status) => {
  const statusConfig = {
    active: {
      label: 'Active',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: 'check-circle'
    },
    suspended: {
      label: 'Suspended',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      icon: 'x-circle'
    },
    pending: {
      label: 'Pending',
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      icon: 'clock'
    },
    locked: {
      label: 'Locked',
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: 'lock'
    },
    unlocked: {
      label: 'Unlocked',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: 'unlock'
    },
    approved: {
      label: 'Approved',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: 'check'
    },
    rejected: {
      label: 'Rejected',
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      icon: 'x'
    },
    processing: {
      label: 'Processing',
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: 'refresh-cw'
    }
  };

  return statusConfig[status] || {
    label: status,
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: 'help-circle'
  };
};

// Format payment method
export const formatPaymentMethod = (method) => {
  if (!method) return 'Not set';
  
  switch (method.type) {
    case 'paypal':
      return `PayPal (${method.paypalEmail || 'No email'})`;
    case 'bank':
      return `Bank Transfer (${method.bankDetails?.bankName || 'No bank'})`;
    default:
      return method.type;
  }
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

// Format time duration
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
