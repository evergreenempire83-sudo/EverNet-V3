import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaTachometerAlt,
  FaUsers,
  FaFileInvoiceDollar,
  FaMoneyCheckAlt,
  FaSearch,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaVideo,
  FaChartBar,
  FaUserCircle,
  FaChevronDown,
  FaMoon,
  FaSun
} from 'react-icons/fa';
import NotificationCenter from '../../admin/Notifications/NotificationCenter';

const AdminLayout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      await logout();
      navigate('/login');
    }
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/admin', icon: FaTachometerAlt },
    { name: 'Creators', path: '/admin/creators', icon: FaUsers },
    { name: 'Reports', path: '/admin/reports', icon: FaFileInvoiceDollar },
    { name: 'Withdrawals', path: '/admin/withdrawals', icon: FaMoneyCheckAlt },
    { name: 'Scanner', path: '/admin/scanner', icon: FaSearch },
    { name: 'Notifications', path: '/admin/notifications', icon: FaBell },
    { name: 'Settings', path: '/admin/settings', icon: FaCog },
  ];

  const stats = {
    totalEarnings: 1250.50,
    totalLocked: 350.25,
    totalAvailable: 150.75,
    pendingWithdrawals: 3,
    activeCreators: 24,
    videosScanned: 156
  };

  const Sidebar = () => (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: sidebarOpen ? 0 : -300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-navy-primary to-navy-dark shadow-2xl transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-navy-light/30">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center space-x-3"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-gold-primary to-gold-dark rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-navy-primary font-bold text-xl">E</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">EverNet</h1>
            <p className="text-xs text-gold-primary/80">Admin System</p>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-4">
        <div className="space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `sidebar-link group ${isActive ? 'active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{item.name}</span>
              <motion.div
                className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ x: 5 }}
              >
                <div className="w-2 h-2 bg-gold-primary rounded-full"></div>
              </motion.div>
            </NavLink>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="mt-8 p-4 bg-navy-light/20 rounded-xl border border-navy-light/30">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
            Platform Overview
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Total Earnings</span>
              <span className="text-sm font-bold text-gold-primary">
                ${stats.totalEarnings.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Locked Balance</span>
              <span className="text-sm font-bold text-amber-400">
                ${stats.totalLocked.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Active Creators</span>
              <span className="text-sm font-bold text-emerald-400">
                {stats.activeCreators}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <button
            onClick={() => {
              navigate('/admin/scanner');
              setMobileMenuOpen(false);
            }}
            className="w-full btn-primary py-3 text-sm font-semibold"
          >
            <FaSearch className="inline mr-2" />
            Run Scanner Now
          </button>
        </div>
      </nav>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-navy-light/30 bg-navy-dark/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gold-primary to-gold-dark rounded-full flex items-center justify-center">
            <span className="font-bold text-navy-primary text-lg">
              {user?.displayName?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.displayName || 'Admin User'}
            </p>
            <p className="text-xs text-white/60 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );

  const TopNavbar = () => (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <FaTimes className="h-6 w-6 text-gray-700" />
              ) : (
                <FaBars className="h-6 w-6 text-gray-700" />
              )}
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block ml-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FaBars className="h-5 w-5 text-gray-700" />
            </button>

            <div className="ml-4 flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search creators, reports, videos..."
                  className="pl-10 pr-4 py-2 w-64 lg:w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-primary focus:border-transparent"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Scanner Status */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-emerald-700">
                Scanner Active
              </span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FaBell className="h-6 w-6 text-gray-700" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  3
                </span>
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                  >
                    <NotificationCenter onClose={() => setNotificationsOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-navy-primary to-navy-dark rounded-full flex items-center justify-center">
                  <span className="font-bold text-white text-lg">
                    {user?.displayName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.displayName || 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <FaChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => navigate('/admin/settings')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <FaUserCircle className="inline mr-2" />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => toast('Dark mode coming soon!')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <FaMoon className="inline mr-2" />
                        Dark Mode
                      </button>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FaSignOutAlt className="inline mr-2" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 lg:hidden z-40"
          />
        )}
      </AnimatePresence>

      {/* Layout Container */}
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNavbar />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                © {new Date().getFullYear()} EverNet Admin System v1.0.0
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-500">System Online</span>
                </div>
                <button
                  onClick={() => toast('System status details coming soon!')}
                  className="text-sm text-navy-primary hover:text-navy-dark font-medium"
                >
                  System Status
                </button>
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Help & Support
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
