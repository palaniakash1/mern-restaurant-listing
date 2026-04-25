import React from 'react';
import { Routes, useLocation, Route } from 'react-router-dom';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Restaurants from './pages/Restaurants';
import NearMe from './pages/NearMe';
import SingleRestaurant from './pages/SingleRestaurant';
import SearchResults from './pages/SearchResults';
import MenuPage from './pages/MenuPage';
import ContactPage from './pages/ContactPage';
import GalleryPage from './pages/GalleryPage';
import ReviewsPage from './pages/ReviewsPage';
import FavoritesPage from './pages/FavoritesPage';
import FaqPage from './pages/FaqPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import PrivateRoute from './components/PrivateRoute';
import { ToastProvider } from './context/ToastContext';
import 'flowbite/dist/flowbite.css';
import { LoadScript } from '@react-google-maps/api';
import { googleMapsApiKey, hasGoogleMapsConfig } from './config/env';

const libraries = ['places'];

function AppContent() {
  const location = useLocation();

  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const authentication =
    location.pathname.startsWith('/sign') ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';

  return (
    <>
      <ScrollToTop />
      {!authentication && !isDashboardPage && <Header />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/restaurants" element={<Restaurants />} />
        <Route path="/near-me" element={<NearMe />} />
        <Route path="/restaurants/:slug" element={<SingleRestaurant />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="/profile" element={<Profile />} />
      </Routes>

      {!authentication && !isDashboardPage && <Footer />}
    </>
  );
}

export default function App() {
  const content = (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );

  if (!hasGoogleMapsConfig) {
    console.error(
      'Google Maps is not configured. Set VITE_GOOGLE_MAPS_API_KEY in client/.env.development.local.'
    );
    return content;
  }

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={libraries}>
      {content}
    </LoadScript>
  );
}
