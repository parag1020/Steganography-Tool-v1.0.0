import React from "react";
import { motion } from "framer-motion";
import { buttonMotion } from "../variants";
import { ShieldCheck } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <ShieldCheck className="text-primary" />
          <span className="font-semibold tracking-wide">StegoLSB • PARAG PATEL CyberGuard</span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
          <a href="#features" className="hover:text-text">Features</a>
          <a href="#tool" className="hover:text-text">Tool</a>
          <a href="#docs" className="hover:text-text">Docs</a>
        </nav>
        <motion.a
          href="#tool"
          variants={buttonMotion}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          className="rounded-xl bg-primary/90 px-4 py-2 font-medium text-bg shadow-glow"
        >
          Try Now
        </motion.a>
      </div>
    </header>
  );
}


