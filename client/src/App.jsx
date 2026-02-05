import React from "react";
import { BrowserRouter, Routes, useLocation, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Header from "./components/Header";
import PrivateRoute from "./components/PrivateRoute";
import "flowbite/dist/flowbite.css";
import { LoadScript } from "@react-google-maps/api";

const libraries = ["places"];

function AppContent() {
  const location = useLocation();

  const isDashboardPage = location.pathname.startsWith("/dashboard");
  const authentication = location.pathname.startsWith("/sign");

  return (
    <>
      {!authentication && !isDashboardPage && <Header />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/about" element={<About />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <>
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
      >
        <AppContent />
      </LoadScript>
    </>
  );
}
