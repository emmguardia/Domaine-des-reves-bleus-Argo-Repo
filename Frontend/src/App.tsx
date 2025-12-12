import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ResetPasswordForm from './components/ResetPasswordForm';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Products from './pages/Products';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Profile from './pages/Profile';
import MentionsLegales from './pages/MentionsLegales';
import CGV from './pages/CGV';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
      <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
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
          </Routes>
                  </main>
                  <Footer />
                </div>
      </Router>
  );
}

export default App;