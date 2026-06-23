import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DailyTracker from './pages/DailyTracker';
import MonthlyOverview from './pages/MonthlyOverview';
import TopicHours from './pages/TopicHours';
import Targets from './pages/Targets';
import WeeklyTracker from './pages/WeeklyTracker';
import SubscriptionPage from './pages/SubscriptionPage';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const status = user.subscription_status;
  const trialEnd = user.trial_end ? new Date(user.trial_end) : null;
  const now = new Date();

  if (status === 'trial' && trialEnd && now < trialEnd) return children;
  if (status === 'active') return children;
  if (window.location.pathname !== '/subscription') {
    return <Navigate to="/subscription" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="daily" element={<DailyTracker />} />
          <Route path="weekly" element={<WeeklyTracker />} />
          <Route path="monthly" element={<MonthlyOverview />} />
          <Route path="topics" element={<TopicHours />} />
          <Route path="targets" element={<Targets />} />
          <Route path="subscription" element={<SubscriptionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
