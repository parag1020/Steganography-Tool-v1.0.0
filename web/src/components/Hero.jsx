import React from "react";
import { motion } from "framer-motion";
import { fadeUp } from "../variants";

export default function Hero() {
  return (
    <section className="relative overflow-hidden gradient-animated">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl"
             style={{ background: "radial-gradient(ellipse at center, rgba(0,178,169,0.25), transparent 60%)" }} />
        <div className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full blur-3xl"
             style={{ background: "radial-gradient(ellipse at center, rgba(199,255,127,0.18), transparent 60%)" }} />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible"
          className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight"
        >
          Hide your secrets in plain sight.
        </motion.h1>
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
          className="mx-auto mt-4 max-w-2xl text-muted"
        >
          StegoLSB — Secure, lossless image steganography with optional AES encryption.
        </motion.p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a href="#tool" className="btn-glow rounded-xl bg-primary/90 px-6 py-3 font-semibold text-bg shadow-glow">Try StegoLSB</a>
          <a href="#docs" className="btn-glow rounded-xl border border-white/15 px-6 py-3 font-semibold text-text/90 hover:bg-white/5">View Docs</a>
        </div>
      </div>
    </section>
  );
}


