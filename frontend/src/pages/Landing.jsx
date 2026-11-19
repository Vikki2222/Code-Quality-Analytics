import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { PageLoading } from '../components/ui/StatusMessage';
import LandingPage from './landing/LandingPage';

const LOGIN_ERRORS = {
  github_auth_failed: 'GitHub sign-in was cancelled or failed. Please try again.',
};

export default function Landing() {
  const { user, checking } = useAuth();
  const [params] = useSearchParams();

  if (checking) return <PageLoading />;
  if (user) return <Navigate to="/repos" replace />;

  const errorCode = params.get('error');
  const loginError = errorCode && (LOGIN_ERRORS[errorCode] || 'Sign-in failed. Please try again.');

  return <LandingPage loginError={loginError} />;
}
