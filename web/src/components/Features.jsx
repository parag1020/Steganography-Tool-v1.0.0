import React from "react";
import { motion } from "framer-motion";
import { fadeUp } from "../variants";
import { Lock, Image, ShieldCheck } from "lucide-react";

const cards = [
  { icon: Lock, title: "Secure Encryption", desc: "Optional AES‑256‑GCM protection with password‑based key (PBKDF2‑HMAC‑SHA‑256)." },
  { icon: Image, title: "Lossless Embedding", desc: "PNG/BMP preferred; preserve visual fidelity using LSB bits (1‑4)." },
  { icon: ShieldCheck, title: "Integrity & Capacity", desc: "Auto capacity checks and parameter matching for reliable extraction." }
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-16">
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div key={c.title} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i+1}
            whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 250, damping: 20 }}
            className="glass rounded-2xl p-6 shadow-glass">
            <c.icon className="text-primary mb-3" />
            <h3 className="text-lg font-semibold mb-1">{c.title}</h3>
            <p className="text-sm text-muted">{c.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}


