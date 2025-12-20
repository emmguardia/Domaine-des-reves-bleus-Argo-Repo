import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ResetPasswordForm from './components/ResetPasswordForm';
import Products from './pages/Products';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Header from './components/Header';
import Footer from './components/Footer';

// Lazy load des pages moins critiques pour réduire le chunk initial
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const Profile = lazy(() => import('./pages/Profile'));
const MentionsLegales = lazy(() => import('./pages/MentionsLegales'));
const CGV = lazy(() => import('./pages/CGV'));
const PolitiqueConfidentialite = lazy(() => import('./pages/PolitiqueConfidentialite'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Composant de chargement
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Chargement...</p>
    </div>
  </div>
);

function App() {
  return (
      <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/reset-password" element={<ResetPasswordForm />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/products" element={<Products />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/metion-legale" element={<MentionsLegales />} />
              <Route path="/cgv" element={<CGV />} />
              <Route path="/politique-de-confidentialite" element={<PolitiqueConfidentialite />} />
              <Route path="/admin-panel" element={<AdminLogin />} />
              <Route path="/admin-panel/*" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
      </Router>
  );
}

export default App;