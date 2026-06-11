import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useClickSound from './hooks/useClickSound'
import NekoCat from './components/NekoCat'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import PrivateRoute from './components/PrivateRoute'
import DashboardLayout from './components/DashboardLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CamerasPage from './pages/CamerasPage'
import CustomersPage from './pages/CustomersPage'
import RentalsPage from './pages/RentalsPage'
import ExpensesPage from './pages/ExpensesPage'
import ReportPage from './pages/ReportPage'
import NotificationsPage from './pages/NotificationsPage'
import CalendarPage from './pages/CalendarPage'
import RecipesPage from './pages/RecipesPage'

export default function App() {
  useClickSound()
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="cameras" element={<CamerasPage />} />
              <Route path="rentals" element={<RentalsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="report" element={<ReportPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="recipes" element={<RecipesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
      <NekoCat />
    </BrowserRouter>
  )
}
