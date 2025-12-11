import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Layouts
import AdminLayout from './components/shared/Layout/AdminLayout'
import CreatorLayout from './components/shared/Layout/CreatorLayout'

// Auth Pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard'
import AdminCreators from './pages/Admin/Creators'
import AdminReports from './pages/Admin/Reports'
import AdminWithdrawals from './pages/Admin/Withdrawals'
import AdminScanner from './pages/Admin/Scanner'
import AdminNotifications from './pages/Admin/Notifications'
import AdminSettings from './pages/Admin/Settings'

// Creator Pages
import CreatorDashboard from './pages/Creator/Dashboard'
import CreatorEarnings from './pages/Creator/Earnings'
import CreatorVideos from './pages/Creator/Videos'
import CreatorWithdrawals from './pages/Creator/Withdrawals'
import CreatorProfile from './pages/Creator/Profile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0A2463',
                  color: '#fff',
                  border: '1px solid #FFD700',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="creators" element={<AdminCreators />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="withdrawals" element={<AdminWithdrawals />} />
                <Route path="scanner" element={<AdminScanner />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Creator Routes */}
              <Route path="/creator" element={
                <ProtectedRoute allowedRoles={['creator']}>
                  <CreatorLayout />
                </ProtectedRoute>
              }>
                <Route index element={<CreatorDashboard />} />
                <Route path="earnings" element={<CreatorEarnings />} />
                <Route path="videos" element={<CreatorVideos />} />
                <Route path="withdrawals" element={<CreatorWithdrawals />} />
                <Route path="profile" element={<CreatorProfile />} />
              </Route>

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
