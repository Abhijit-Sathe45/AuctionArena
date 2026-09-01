import React, { lazy, Suspense, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PageLoader from "./components/PageLoader";
import SplashScreen from "./components/SplashScreen";

// Home loads eagerly (zero-delay first paint for the most common landing page).
// Everything else is code-split — each page becomes its own JS chunk, fetched only
// when that route is actually visited, so a player registering doesn't have to
// download the organizer admin panel, live auction, or super admin code.
import Home from "./pages/public/Home";
import AIAssistantWidget from "./components/AIAssistantWidget";

const PlayerRegister = lazy(() => import("./pages/public/PlayerRegister"));
const TeamRegister = lazy(() => import("./pages/public/TeamRegister"));
const BuySoftware = lazy(() => import("./pages/public/BuySoftware"));
const WatchLive = lazy(() => import("./pages/public/WatchLive"));
const StreamOverlay = lazy(() => import("./pages/public/StreamOverlay"));
const HowToUse = lazy(() => import("./pages/public/HowToUse"));
const TeamBidRemote = lazy(() => import("./pages/public/TeamBidRemote"));

const OrganizerLogin = lazy(() => import("./pages/organizer/Login"));
const RenewPass = lazy(() => import("./pages/organizer/RenewPass"));
const Dashboard = lazy(() => import("./pages/organizer/Dashboard"));
const Players = lazy(() => import("./pages/organizer/Players"));
const Teams = lazy(() => import("./pages/organizer/Teams"));
const Categories = lazy(() => import("./pages/organizer/Categories"));
const Settings = lazy(() => import("./pages/organizer/Settings"));
const LiveAuction = lazy(() => import("./pages/organizer/LiveAuction"));
const History = lazy(() => import("./pages/organizer/History"));
const OrganizerHowToUse = lazy(() => import("./pages/organizer/HowToUse"));

const SuperAdminLogin = lazy(() => import("./pages/superadmin/Login"));
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/Dashboard"));

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashScreen onFinish={() => setShowSplash(false)} duration={3000} />
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AIAssistantWidget />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/how-to-use" element={<HowToUse />} />
            <Route path="/get-started" element={<BuySoftware />} />
            <Route path="/register/player/:slug" element={<PlayerRegister />} />
            <Route path="/register/team/:slug" element={<TeamRegister />} />
            <Route path="/watch/:slug" element={<WatchLive />} />
            <Route path="/overlay/:slug" element={<StreamOverlay />} />
            <Route path="/stream-overlay/:slug" element={<StreamOverlay />} />
            <Route path="/bid/:slug" element={<TeamBidRemote />} />

            {/* Organizer */}
            <Route path="/organizer/login" element={<OrganizerLogin />} />
            <Route
              path="/organizer/how-to-use"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <OrganizerHowToUse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/renew"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <RenewPass />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/dashboard"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/players"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <Players />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/teams"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/categories"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/live"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <LiveAuction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/live-auction"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <LiveAuction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/history"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/settings"
              element={
                <ProtectedRoute tokenKey="organizerToken">
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Super Admin */}
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute tokenKey="superAdminToken">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
