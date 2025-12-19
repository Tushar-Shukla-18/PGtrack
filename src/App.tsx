import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import Rooms from "./pages/Rooms";
import Billing from "./pages/Billing";
import Expenses from "./pages/Expenses";
import Campuses from "./pages/Campuses";
import Reminders from "./pages/Reminders";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import RequestAccess from "./pages/RequestAccess";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";

// Super Admin pages
import SuperAdminOverview from "./pages/super-admin/Overview";
import SuperAdminAccessRequests from "./pages/super-admin/AccessRequests";
import SuperAdminManagers from "./pages/super-admin/Managers";
import SuperAdminCampuses from "./pages/super-admin/Campuses";

const queryClient = new QueryClient();

// Protected route for managers
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If super_admin tries to access manager routes, redirect to super admin
  if (profile?.role === "super_admin") {
    return <Navigate to="/super-admin/overview" replace />;
  }
  
  return <>{children}</>;
}

// Protected route for super admin only
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If not super_admin, redirect to dashboard
  if (profile?.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Public route - redirects logged-in users based on role
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    // Redirect based on role
    if (profile?.role === "super_admin") {
      return <Navigate to="/super-admin/overview" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    
    {/* Manager routes */}
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
    <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
    <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
    <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
    <Route path="/campuses" element={<ProtectedRoute><Campuses /></ProtectedRoute>} />
    <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    
    {/* Super Admin routes */}
    <Route path="/super-admin" element={<Navigate to="/super-admin/overview" replace />} />
    <Route path="/super-admin/overview" element={<SuperAdminRoute><SuperAdminOverview /></SuperAdminRoute>} />
    <Route path="/super-admin/access-requests" element={<SuperAdminRoute><SuperAdminAccessRequests /></SuperAdminRoute>} />
    <Route path="/super-admin/managers" element={<SuperAdminRoute><SuperAdminManagers /></SuperAdminRoute>} />
    <Route path="/super-admin/campuses" element={<SuperAdminRoute><SuperAdminCampuses /></SuperAdminRoute>} />
    
    {/* Public routes */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/request-access" element={<PublicRoute><RequestAccess /></PublicRoute>} />
    <Route path="/setup" element={<Setup />} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
