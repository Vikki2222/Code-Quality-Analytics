import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { RequireAuth } from './auth/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import RepoLayout from './components/layout/RepoLayout';
import { PageLoading } from './components/ui/StatusMessage';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

// Pages load on demand; recharts (overview/issue charts) is most of the
// bundle and the landing page doesn't need it. A chunk that fails to load
// (stale hashes after a deploy) is caught by the ErrorBoundary -> Reload.
const Portfolio = lazy(() => import('./pages/Portfolio'));
const RepoOverview = lazy(() => import('./pages/RepoOverview'));
const IssuesPage = lazy(() => import('./pages/IssuesPage'));
const IssueDetail = lazy(() => import('./pages/IssueDetail'));
const FilePage = lazy(() => import('./pages/FilePage'));
const PullsPage = lazy(() => import('./pages/PullsPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  const location = useLocation();

  return (
    // Reset on navigation so a crash on one page doesn't stick after leaving it.
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/repos" element={<Portfolio />} />
            <Route path="/repos/:owner/:repo" element={<RepoLayout />}>
              <Route index element={<RepoOverview />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="issues/:issueId" element={<IssueDetail />} />
              <Route path="file" element={<FilePage />} />
              <Route path="pulls" element={<PullsPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="reviews/:reviewId" element={<ReviewPage />} />
            </Route>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
