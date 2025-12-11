import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaTachometerAlt,
  FaDollarSign,
  FaVideo,
  FaMoneyCheckAlt,
  FaUserCircle,
  FaBell,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaWallet
} from 'react-icons/fa';

const CreatorLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      await logout();
      navigate('/login');
    }
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/creator', icon: FaTachometerAlt },
    { name: 'Earnings', path: '/creator/earnings', icon: FaDollarSign },
    { name: 'My Videos', path: '/creator/videos', icon: FaVideo },
    { name: 'Withdrawals', path: '/creator/withdrawals', icon: FaMoneyCheckAlt },
    { name: 'Profile', path: '/creator/profile', icon: FaUserCircle },
  ];

  const userStats = {
    totalEarnings: 1250.50,
    lockedBalance: 350.25,
    availableBalance: 150.75,
    totalWithdrawn: 749.50,
    pendingWithdrawals: 1
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
            <p className="text-xs text-gold-primary/80">Creator Portal</p>
          </div>
        </motion.div>
      </div>

      {/* Creator Info */}
      <div className="px-4 py-6 border-b border-navy-light/30">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-gold-primary to-gold-dark rounded-full flex items-center justify-center shadow-lg">
            <span className="text-navy-primary font-bold text-2xl">
              {user?.displayName?.charAt(0) || 'C'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white truncate">
              {user?.displayName || 'Creator'}
            </h2>
            <p className="text-sm text-white/60 truncate">{user?.email}</p>
            <div className="mt-1">
              <span className="px-2 py-1 text-xs font-medium bg-gold-primary/20 text-gold-primary rounded-full">
                Music Creator
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 px-4 flex-1">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/creator'}
              className={({ isActive }) =>
                `sidebar-link group ${isActive ? 'active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 p-4 bg-navy-light/20 rounded-xl border border-navy-light/30">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
            Your Earnings
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Available</span>
              <span className="text-sm font-bold text-gold-primary">
                ${userStats.availableBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Locked (90 days)</span>
              <span className="text-sm font-bold text-amber-400">
                ${userStats.lockedBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Total Earned</span>
              <span className="text-sm font-bold text-emerald-400">
                ${userStats.totalEarnings.toFixed(2)}
              </span>
            </div>
          </div>
          {userStats.availableBalance >= 50 && (
            <button
              onClick={() => navigate('/creator/withdrawals')}
              className="w-full mt-4 btn-primary py-2 text-sm font-semibold"
            >
              <FaWallet className="inline mr-2" />
              Request Withdrawal
            </button>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-navy-light/30 bg-navy-dark/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/60">System Active</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            <FaSignOutAlt className="inline mr-1" />
            Logout
          </button>
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

            <div className="ml-4">
              <h1 className="text-lg font-semibold text-gray-900">
                Creator Portal
              </h1>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              onClick={() => toast('Notifications coming soon!')}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FaBell className="h-6 w-6 text-gray-700" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                2
              </span>
            </button>

            {/* Balance Display */}
            <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-navy-primary/10 to-navy-light/10 rounded-lg border border-navy-primary/20">
              <FaWallet className="h-5 w-5 text-navy-primary" />
              <div>
                <p className="text-xs text-gray-500">Available Balance</p>
                <p className="text-lg font-bold text-navy-primary">
                  ${userStats.availableBalance.toFixed(2)}
                </p>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-gold-primary to-gold-dark rounded-full flex items-center justify-center">
                  <span className="font-bold text-navy-primary text-lg">
                    {user?.displayName?.charAt(0) || 'C'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.displayName || 'Creator'}
                  </p>
                  <p className="text-xs text-gray-500">Music Creator</p>
                </div>
                <FaChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
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
                      onClick={() => navigate('/creator/profile')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <FaUserCircle className="inline mr-2" />
                      Profile Settings
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
        />
      )}

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
                © {new Date().getFullYear()} EverNet Creator Portal
              </div>
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => navigate('/creator/profile')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Help Center
                </button>
                <button
                  onClick={() => toast('Contact support coming soon!')}
                  className="text-sm text-navy-primary hover:text-navy-dark font-medium"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default CreatorLayout;
