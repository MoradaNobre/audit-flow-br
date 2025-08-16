import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Condominio from "./pages/Condominio";
import Relatorio from "./pages/Relatorio";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";
import InconsistenciasTeste from "./pages/InconsistenciasTeste";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/condominio/:id" element={
              <ProtectedRoute>
                <Condominio />
              </ProtectedRoute>
            } />
            <Route path="/relatorio/:id" element={
              <ProtectedRoute>
                <Relatorio />
              </ProtectedRoute>
            } />
            <Route path="/relatorio/:id/teste-inconsistencias" element={
              <ProtectedRoute>
                <InconsistenciasTeste />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
