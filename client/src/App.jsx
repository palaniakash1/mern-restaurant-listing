import { BrowserRouter, Routes, Route } from "react-router-dom";
import  Home   from "./pages/home";
import About from "./pages/about";
import SignIn from "./pages/signin";
import SignUp from "./pages/SignUp";
import Profile from "./pages/profile";
import Header from "./components/Header";
import Footer from "./components/Footer";


export default function App() {
  return <BrowserRouter>
    <Header />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/about" element={<About />} />
      <Route path="/profile" element={<Profile />} />
    
    </Routes>
    <Footer />
  </BrowserRouter>;
}
