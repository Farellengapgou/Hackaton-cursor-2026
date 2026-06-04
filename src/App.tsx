import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { TransactionProvider } from './context/TransactionContext';
import { AuthProvider } from './store/authStore';
import { UiProvider } from './store/uiStore';
import { I18nProvider } from './i18n';
import Dashboard from './pages/Dashboard';
import Help from './pages/Help';
import Login from './pages/Login';
import Register from './pages/Register';
import Report from './pages/Report';
import Transactions from './pages/Transactions';

function AuthShell() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <UiProvider>
      <I18nProvider>
        <AuthProvider>
          <TransactionProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<AuthShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="report" element={<Report />} />
                  <Route path="help" element={<Help />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </TransactionProvider>
        </AuthProvider>
      </I18nProvider>
    </UiProvider>
  );
}
