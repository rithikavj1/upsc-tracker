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
  return token ? children : <Navigate to="/login" replace />;
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
