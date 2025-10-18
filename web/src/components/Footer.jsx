import React from "react";
import { Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col items-start">
          <p className="text-sm text-muted">© {new Date().getFullYear()} StegoLSB — Educational use only.</p>
          <p className="text-xs text-muted">Created by <span className="text-primary">Parag Patel</span></p>
        </div>
        <p className="text-xs text-muted">Use this tool only on images and systems you own or have permission for.</p>
        <div className="flex items-center gap-3 text-muted">
          <a 
            href="https://github.com/parag1020" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="GitHub Profile"
            className="hover:text-primary transition-colors"
          >
            <Github size={18} />
          </a>
          <a 
            href="https://www.linkedin.com/in/parag-patel-9593742a7" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="LinkedIn Profile"
            className="hover:text-primary transition-colors"
          >
            <Linkedin size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}



