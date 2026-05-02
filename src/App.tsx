import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { lazy, Suspense, ReactNode } from "react";

import Index from "./pages/Index";

// Lazy: pages outside the studio (infrequent, large)
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const WhoItsForPage = lazy(() => import("./pages/WhoItsForPage"));
const TheSystemPage = lazy(() => import("./pages/TheSystemPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

// StudioShell must be eagerly imported — all studio pages statically import
// useShell from it. If StudioShell is lazy, the context is uninitialized when
// studio pages mount, causing useContext to return the empty default and crash.
import StudioShell from "./components/studio/StudioShell";

// Eager: all studio pages (instant tab switching, no flash)
import Dashboard from "./pages/studio/Dashboard";
import WorkSession from "./pages/studio/WorkSession";
import Watch from "./pages/studio/Watch";
import OutputLibrary from "./pages/studio/OutputLibrary";
import OutputDetail from "./pages/studio/OutputDetail";
import Projects from "./pages/studio/Projects";
import ProjectDetail from "./pages/studio/ProjectDetail";
import Resources from "./pages/studio/Resources";
import Settings from "./pages/studio/Settings";
import VoiceDnaSettings from "./pages/studio/VoiceDnaSettings";
import BrandDnaSettings from "./pages/studio/BrandDnaSettings";
import ComposerMemorySettings from "./pages/studio/ComposerMemorySettings";
import TheLot from "./pages/studio/TheLot";
import Workbench from "./pages/studio/Workbench";
import Wrap from "./pages/studio/Wrap";
import VisualWrap from "./pages/studio/VisualWrap";
import AdminPanel from "./pages/studio/AdminPanel";
import Templates from "./pages/studio/Templates";
// CO_038A: per-category output routes (content/social/business/extended)
// were consolidated into the single /studio/outputs Library landing.

// Page transition: only for marketing/auth pages, not studio
function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div style={{ animation: "pageEnter 0.4s ease forwards", background: "#060D14", minHeight: "100vh" }}>
      {children}
    </div>
  );
}

const suspenseFallback = <div style={{ background: "#060D14", height: "100vh" }} />;

const App = () => (
  <AuthProvider>
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
        <style>{`
          @keyframes pageEnter {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        <Routes>
          <Route path="/" element={<Navigate to="/explore" replace />} />
          <Route path="/explore" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}><ExplorePage /></Suspense>
            </PageTransition>
          } />
          <Route path="/how-it-works" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}><HowItWorksPage /></Suspense>
            </PageTransition>
          } />
          <Route path="/who-its-for" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}><WhoItsForPage /></Suspense>
            </PageTransition>
          } />
          <Route path="/the-system" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}><TheSystemPage /></Suspense>
            </PageTransition>
          } />
          <Route path="/about" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}><AboutPage /></Suspense>
            </PageTransition>
          } />
          <Route path="/auth" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}><AuthPage /></Suspense>
            </PageTransition>
          } />
          <Route path="/onboarding" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}>
                <ProtectedRoute><OnboardingPage /></ProtectedRoute>
              </Suspense>
            </PageTransition>
          } />
          {/* Studio: no PageTransition, no animation, instant switching */}
          <Route path="/studio" element={
            <Suspense fallback={suspenseFallback}>
              <ProtectedRoute><StudioShell /></ProtectedRoute>
            </Suspense>
          }>
            <Route index element={<Navigate to="/studio/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="work" element={<WorkSession />} />
            <Route path="work/:id" element={<WorkSession />} />
            <Route path="watch" element={<Watch />} />
            <Route path="outputs" element={<OutputLibrary />} />
            <Route path="outputs/templates" element={<Templates />} />
            <Route path="outputs/:id" element={<OutputDetail />} />
            <Route path="wrap" element={<Wrap />} />
            <Route path="wrap/visual/:outputId" element={<VisualWrap />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="resources" element={<Resources />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/voice" element={<VoiceDnaSettings />} />
            <Route path="settings/brand" element={<BrandDnaSettings />} />
            <Route path="settings/memory" element={<ComposerMemorySettings />} />
            <Route path="lot" element={<TheLot />} />
            <Route path="workbench" element={<Workbench />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>
          <Route path="/terms" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}>
                <TermsOfServicePage />
              </Suspense>
            </PageTransition>
          } />
          <Route path="/privacy" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}>
                <PrivacyPolicyPage />
              </Suspense>
            </PageTransition>
          } />
          <Route path="/cookies" element={
            <PageTransition>
              <Suspense fallback={suspenseFallback}>
                <CookiePolicyPage />
              </Suspense>
            </PageTransition>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </AuthProvider>
);
export default App;
