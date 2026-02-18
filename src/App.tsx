import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PendingPage from "@/pages/PendingPage";
import BlockedPage from "@/pages/BlockedPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductFormPage from "@/pages/ProductFormPage";
import HoldsPage from "@/pages/HoldsPage";
import DealsPage from "@/pages/DealsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route path="/blocked" element={<BlockedPage />} />

            {/* Protected app routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={
                <ProtectedRoute requireRole="seller"><ProductFormPage /></ProtectedRoute>
              } />
              <Route path="/products/:id/edit" element={
                <ProtectedRoute requireRole="seller"><ProductFormPage /></ProtectedRoute>
              } />
              <Route path="/holds" element={<HoldsPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/seller" element={
                <ProtectedRoute requireRole="seller"><ProductsPage /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireRole="admin"><AdminUsersPage /></ProtectedRoute>
              } />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
