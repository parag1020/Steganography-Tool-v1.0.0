import React from "react";
import { AppProvider } from "./context/AppContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Features from "./components/Features.jsx";
import Tool from "./components/Tool.jsx";
import Docs from "./components/Docs.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <AppProvider>
      <div>
        <Navbar />
        <Hero />
        <Features />
        <Tool />
        <Docs />
        <Footer />
      </div>
    </AppProvider>
  );
}



