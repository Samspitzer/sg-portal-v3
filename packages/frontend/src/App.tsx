import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { msalInstance } from '@/services/auth';
import { 
  Layout, 
  AuthGuard,
  AccountingLayout,
  ProjectsLayout,
  EstimatingLayout,
  CustomersLayout,
  AdminLayout,
} from '@/components/layout';
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
        
        {/* Customers Panel */}
        <Route
          path="/clients/*"
          element={
            <AuthGuard requiredPermission="customers:view">
              <Layout>
                <CustomersLayout>
                  <ClientsPage />
                </CustomersLayout>
              </Layout>
            </AuthGuard>
          }
        />
        
        {/* Projects Panel */}
        <Route
          path="/projects/*"
          element={
            <AuthGuard requiredPermission="projects:view">
              <Layout>
                <ProjectsLayout>
                  <ProjectsPage />
                </ProjectsLayout>
              </Layout>
            </AuthGuard>
          }
        />
        
        {/* Estimating Panel */}
        <Route
          path="/estimates/*"
          element={
            <AuthGuard requiredPermission="estimating:view">
              <Layout>
                <EstimatingLayout>
                  <EstimatesPage />
                </EstimatingLayout>
              </Layout>
            </AuthGuard>
          }
        />
        
        {/* Accounting Panel - Invoices */}
        <Route
          path="/invoices/*"
          element={
            <AuthGuard requiredPermission="accounting:view">
              <Layout>
                <AccountingLayout>
                  <InvoicesPage />
                </AccountingLayout>
              </Layout>
            </AuthGuard>
          }
        />
        
        {/* Accounting Panel - Main */}
        <Route
          path="/accounting/*"
          element={
            <AuthGuard requiredPermission="accounting:view">
              <Layout>
                <AccountingLayout>
                  <AccountingPage />
                </AccountingLayout>
              </Layout>
            </AuthGuard>
          }
        />
        
        {/* Admin Panel */}
        <Route
          path="/admin/*"
          element={
            <AuthGuard requiredPermission="admin:view">
              <Layout>
                <AdminLayout>
                  <AdminPage />
                </AdminLayout>
              </Layout>
            </AuthGuard>
          }
        />
        
        {/* Developer - no side ribbon for now */}
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
        
        {/* Profile - no side ribbon */}
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
        
        {/* Settings - no side ribbon */}
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