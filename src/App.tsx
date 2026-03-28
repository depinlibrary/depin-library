import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageTransition from "@/components/PageTransition";
import { useRealtimeForecasts } from "@/hooks/useForecasts";
import { useRealtimeTokenMarketData } from "@/hooks/useTokenMarketData";
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
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

/** Activates global realtime subscriptions */
function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeForecasts();
  useRealtimeTokenMarketData();
  return <>{children}</>;
}

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Overview /></PageTransition>} />
        <Route path="/explore" element={<PageTransition><Explore /></PageTransition>} />
        <Route path="/project/:slug" element={<PageTransition><ProjectDetail /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/submit" element={<PageTransition><SubmitProject /></PageTransition>} />
        <Route path="/portfolio" element={<PageTransition><Portfolio /></PageTransition>} />
        <Route path="/market" element={<PageTransition><MarketOverview /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/compare" element={<PageTransition><CompareProjects /></PageTransition>} />
        <Route path="/forecasts" element={<PageTransition><Forecasts /></PageTransition>} />
        <Route path="/forecasts/:id" element={<PageTransition><ForecastDetail /></PageTransition>} />
        <Route path="/notifications" element={<PageTransition><Notifications /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

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
          <RealtimeProvider>
            <AnimatedRoutes />
          </RealtimeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </ErrorBoundary>
);

export default App;
