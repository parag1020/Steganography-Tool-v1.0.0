import React from "react";
import { motion } from "framer-motion";
import { fadeUp } from "../variants";

export default function Docs() {
  return (
    <section id="docs" className="mx-auto max-w-7xl px-4 py-16">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid gap-6 md:grid-cols-2"
      >
        <div className="glass rounded-2xl p-6 shadow-glass">
          <h3 className="mb-3 font-semibold">How LSB Works</h3>
          <p className="text-sm text-muted">
            Least-Significant-Bit (LSB) steganography stores payload bits in the
            lowest bits of image pixel channels. Using 1–4 bits per channel on
            PNG/BMP maintains visual fidelity. Extraction reads the same order
            of pixels and channels to reconstruct the header and payload.
          </p>
          <div className="mt-4 grid grid-cols-8 gap-1 text-center text-[10px]">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="rounded bg-surface/70 p-2">{(i % 2) ? 1 : 0}</div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-6 shadow-glass">
          <h3 className="mb-3 font-semibold">Capacity Calculator</h3>
          <p className="text-sm text-muted">Capacity ≈ width × height × channels × bits / 8 bytes.</p>
          <pre className="mt-3 rounded-xl bg-surface/70 p-3 text-xs">1024×1024, rgb, 1 bit → ~384 KB</pre>
          <pre className="mt-2 rounded-xl bg-surface/70 p-3 text-xs">1024×1024, rgb, 2 bits → ~768 KB</pre>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mt-6 glass rounded-2xl p-6 shadow-glass"
      >
        <h3 className="mb-3 font-semibold">Ethical Use</h3>
        <p className="text-sm text-muted">
          Use StegoLSB only on images and systems you own or have explicit
          permission to modify. Do not conceal unlawful or harmful material.
        </p>
      </motion.div>
    </section>
  );
}





