import { useEffect } from 'react';
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
  SalesLayout,
  TasksLayout,
} from '@/components/layout';
import { ToastContainer, PageNavigationGuard } from '@/components/common';
import {
  LoginPage,
  LandingPage,
  DashboardPage,
  ClientsPage,
  ContactsPage,
  ProjectsPage,
  EstimatesPage,
  InvoicesPage,
  AccountingPage,
  AdminPage,
  DeveloperPage,
  ProfilePage,
  NotificationSettingsPage,
  SalesPage,
  TasksPage,
} from '@/components/panels';
import { useClientsStore } from '@/contexts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle one-time migrations on app startup
function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Migrate existing companies/contacts to have slugs (one-time migration)
    // This is safe to call multiple times - it only updates records without slugs
    useClientsStore.getState().migrateExistingSlugs();
  }, []);

  return <>{children}</>;
}

function AppRoutes() {
  return (
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
      <Route
        path="/clients/contacts"
        element={
          <AuthGuard requiredPermission="customers:view">
            <Layout>
              <CustomersLayout>
                <ContactsPage />
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
      
      {/* Notification Settings - no side ribbon */}
      <Route
        path="/notifications"
        element={
          <AuthGuard>
            <Layout>
              <NotificationSettingsPage />
            </Layout>
          </AuthGuard>
        }
      />

      {/* Sales Panel */}
<Route
  path="/sales/*"
  element={
    <AuthGuard>
      <SalesLayout>
        <Routes>
          <Route index element={<SalesPage />} />
          <Route path="pipeline" element={<SalesPage />} />
          <Route path="leads" element={<SalesPage />} />
          <Route path="activities" element={<SalesPage />} />
        </Routes>
      </SalesLayout>
    </AuthGuard>
  }
/>

{/* Tasks Panel */}
<Route
  path="/tasks/*"
  element={
    <AuthGuard>
      <TasksLayout>
        <Routes>
          <Route index element={<TasksPage />} />
          <Route path="calendar" element={<TasksPage />} />
          <Route path="list" element={<TasksPage />} />
        </Routes>
      </TasksLayout>
    </AuthGuard>
  }
/>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppInitializer>
            <AppRoutes />
            <PageNavigationGuard />
            <ToastContainer />
          </AppInitializer>
        </BrowserRouter>
      </QueryClientProvider>
    </MsalProvider>
  );
}