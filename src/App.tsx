import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Overview from "./pages/Overview";
import Explore from "./pages/Explore";
import ProjectDetail from "./pages/ProjectDetail";
import Auth from "./pages/Auth";
import SubmitProject from "./pages/SubmitProject";
import AdminDashboard from "./pages/AdminDashboard";
import Portfolio from "./pages/Portfolio";
import MarketOverview from "./pages/MarketOverview";
import CompareProjects from "./pages/CompareProjects";
import Forecasts from "./pages/Forecasts";
import ForecastDetail from "./pages/ForecastDetail";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/project/:slug" element={<ProjectDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/submit" element={<SubmitProject />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/market" element={<MarketOverview />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/compare" element={<CompareProjects />} />
            <Route path="/forecasts" element={<Forecasts />} />
            <Route path="/forecasts/:id" element={<ForecastDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
