import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Loading from './components/Loading.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Groceries from './pages/Groceries.jsx';
import Food from './pages/Food.jsx';
import Cart from './pages/Cart.jsx';
import OrderDone from './pages/OrderDone.jsx';
import PayMomo from './pages/PayMomo.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import { useAuth } from './context/AuthContext.jsx';

function ScrollTop() {
  const { pathname } = useLocation();
 useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AdminOnly({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <Loading message="Checking your account..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/groceries" element={<Groceries />} />
          <Route path="/food" element={<Food />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/pay/:orderNo" element={<PayMomo />} />
          <Route path="/order/:orderNo" element={<OrderDone />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/admin" element={<AdminOnly><Dashboard /></AdminOnly>} />
          <Route path="*" element={<p className="p-16 text-center text-black/60">Page not found.</p>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
