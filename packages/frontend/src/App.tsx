import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { msalInstance } from '@/services/auth';
import { Layout, AuthGuard } from '@/components/layout';
import { ToastContainer } from '@/components/common';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { NavigationBlocker } from '@/components/ui/NavigationBlocker';
import {
  LoginPage,
  LandingPage,
  DashboardPage,
  ClientsPage,
  ProjectsPage,
  EstimatesPage,
  InvoicesPage,
  AccountingPage,
  AdminPage,
  DeveloperPage,
  ProfilePage,
  SettingsPage,
} from '@/components/panels';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <>
      <NavigationBlocker />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <LandingPage />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Layout>
                <DashboardPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/clients/*"
          element={
            <AuthGuard requiredPermission="customers:view">
              <Layout>
                <ClientsPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/projects/*"
          element={
            <AuthGuard requiredPermission="projects:view">
              <Layout>
                <ProjectsPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/estimates/*"
          element={
            <AuthGuard requiredPermission="estimating:view">
              <Layout>
                <EstimatesPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/invoices/*"
          element={
            <AuthGuard requiredPermission="accounting:view">
              <Layout>
                <InvoicesPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/accounting/*"
          element={
            <AuthGuard requiredPermission="accounting:view">
              <Layout>
                <AccountingPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AuthGuard requiredPermission="admin:view">
              <Layout>
                <AdminPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/developer/*"
          element={
            <AuthGuard requiredPermission="developer:view">
              <Layout>
                <DeveloperPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <Layout>
                <ProfilePage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <Layout>
                <SettingsPage />
              </Layout>
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer />
          <UnsavedChangesModal />
        </BrowserRouter>
      </QueryClientProvider>
    </MsalProvider>
  );
}