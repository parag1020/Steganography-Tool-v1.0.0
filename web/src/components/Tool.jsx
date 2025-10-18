import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "../variants";
import UploadZone from "./UploadZone.jsx";
import ImagePreview from "./ImagePreview.jsx";
import Toast from "./Toast.jsx";
import { useApp } from "../context/AppContext.jsx";
import { calcCapacityBytes, embedIntoImage, extractFromImage } from "../utils/lsb.js";
import { Copy, Download, Key, Lock, Unlock, Settings, Trash2 } from "lucide-react";

function human(n) {
  const u = ["B", "KB", "MB", "GB"]; let i = 0, x = n;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(2)} ${u[i]}`;
}

export default function Tool() {
  const [tab, setTab] = useState("embed");
  const [payloadText, setPayloadText] = useState("");
  const [payloadFile, setPayloadFile] = useState(null);
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  
  // Use shared state from context
  const {
    image,
    previewUrl,
    handleImageUpload,
    clearImage,
    bits,
    setBits,
    channel,
    setChannel,
    encrypt,
    setEncrypt,
    password,
    setPassword,
    resultText,
    setResultText,
    resultUrl,
    setResultUrl,
    busy,
    setBusy,
    clearResults,
  } = useApp();

  const capacity = useMemo(() => image ? calcCapacityBytes(image.width, image.height, channel, bits) : 0, [image, bits, channel]);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
  };

  async function startEmbed() {
    if (!image) return showToast("error", "Please upload a cover image first.");
    const enc = new TextEncoder();
    let payload;
    if (payloadFile) {
      payload = new Uint8Array(await payloadFile.arrayBuffer());
    } else {
      payload = enc.encode(payloadText || "");
    }
    const need = payload.length + 64; // approx header
    if (need > capacity) return showToast("error", `Insufficient capacity. Need ~${human(need)} but have ${human(capacity)}.`);

    try {
      setBusy(true);
      const canvas = await embedIntoImage({ image, payloadBytes: payload, bits, channel, encrypt, password, filename: payloadFile?.name || "", isText: !payloadFile });
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        showToast("success", "Embedding complete!");
        setBusy(false);
      }, "image/png");
    } catch (e) {
      console.error(e);
      showToast("error", e.message || "Failed to embed");
      setBusy(false);
    }
  }

  async function startExtract() {
    if (!image) return showToast("error", "Upload a stego image to extract from.");
    try {
      setBusy(true);
      const { payload } = await extractFromImage({ image, forcedBits: null, forcedChannel: null, password });
      try {
        const text = new TextDecoder().decode(payload);
        setResultText(text);
      } catch {
        setResultText("");
      }
      const url = URL.createObjectURL(new Blob([payload], { type: "application/octet-stream" }));
      setResultUrl(url);
      showToast("success", "Extraction complete!");
      setBusy(false);
    } catch (e) {
      console.error(e);
      showToast("error", e.message || "Failed to extract");
      setBusy(false);
    }
  }

  return (
    <>
    <section id="tool" className="mx-auto max-w-7xl px-4 py-16">
        {/* Enhanced Tab Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button 
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={() => setTab("embed")} 
              className={`relative rounded-2xl px-6 py-3 font-medium transition-all duration-300 ${
                tab === "embed" 
                  ? "bg-primary/90 text-bg shadow-lg shadow-primary/25" 
                  : "bg-white/5 text-muted hover:bg-white/10 hover:text-white"
              }`}
            >
              Embed
              {tab === "embed" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-2xl bg-primary/90 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.98 }} 
              whileHover={{ scale: 1.02 }}
              onClick={() => setTab("extract")} 
              className={`relative rounded-2xl px-6 py-3 font-medium transition-all duration-300 ${
                tab === "extract" 
                  ? "bg-primary/90 text-bg shadow-lg shadow-primary/25" 
                  : "bg-white/5 text-muted hover:bg-white/10 hover:text-white"
              }`}
            >
              Extract
              {tab === "extract" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-2xl bg-primary/90 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
      </div>

          {/* Image Preview Thumbnail */}
          {image && (
            <div className="flex items-center gap-3">
              <ImagePreview 
                image={image} 
                previewUrl={previewUrl} 
                onClear={clearImage}
                className="w-16 h-16"
              />
              <button
                onClick={clearImage}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all"
                title="Clear Image"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        <motion.div 
          variants={fadeUp} 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }} 
          className="grid gap-8 lg:grid-cols-2"
        >
          {/* Image Upload Section */}
          <div className="glass rounded-2xl p-8 shadow-glass">
            <div className="flex items-center gap-3 mb-6">
              <Settings size={20} className="text-primary" />
              <h3 className="text-xl font-semibold">Image Upload</h3>
            </div>
            <UploadZone onImage={handleImageUpload} />
            {image && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Dimensions:</span>
                  <span className="font-mono">{image.width} × {image.height}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Capacity:</span>
                  <span className="font-mono text-primary">{human(capacity)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="glass rounded-2xl p-8 shadow-glass">
          {tab === "embed" ? (
            <>
                <div className="flex items-center gap-3 mb-6">
                  <Lock size={20} className="text-primary" />
                  <h3 className="text-xl font-semibold">Embed Settings</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Payload Text</label>
                    <textarea 
                      value={payloadText} 
                      onChange={(e) => setPayloadText(e.target.value)} 
                      placeholder="Enter your secret message here..." 
                      className="neon-focus w-full rounded-xl bg-surface/70 p-4 text-sm border border-white/10 focus:border-primary/50 transition-colors" 
                      rows={4} 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Or Upload File</label>
                    <input 
                      type="file" 
                      onChange={(e) => setPayloadFile(e.target.files?.[0] ?? null)} 
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/20 file:text-primary hover:file:bg-primary/30 transition-colors" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">LSB Bits: {bits}</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="4" 
                        value={bits} 
                        onChange={(e) => setBits(parseInt(e.target.value))} 
                        className="w-full accent-primary"
                      />
                      </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Channels</label>
                      <select 
                        value={channel} 
                        onChange={(e) => setChannel(e.target.value)} 
                        className="neon-focus w-full rounded-xl bg-surface/70 p-3 text-sm border border-white/10 focus:border-primary/50"
                      >
                        <option value="rgb">RGB</option>
                        <option value="r">Red</option>
                        <option value="g">Green</option>
                        <option value="b">Blue</option>
                        <option value="rgba">RGBA</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={encrypt} 
                        onChange={(e) => setEncrypt(e.target.checked)} 
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="flex items-center gap-2">
                        {encrypt ? <Lock size={16} /> : <Unlock size={16} />} 
                        Enable AES-256-GCM Encryption
                      </span>
                    </label>
                    {encrypt && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 rounded-xl bg-surface/70 p-4 border border-white/10">
                          <Key size={16} className="text-muted" />
                          <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Enter encryption password" 
                            className="w-full bg-transparent outline-none text-sm" 
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  <motion.button 
                    whileTap={{ scale: 0.98 }} 
                    whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0, 224, 199, 0.3)" }}
                    disabled={busy} 
                    onClick={startEmbed} 
                    className="w-full btn-glow rounded-xl bg-primary/90 px-6 py-4 text-bg font-medium shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? "Embedding..." : "Start Embedding"}
                  </motion.button>
              </div>
            </>
          ) : (
            <>
                <div className="flex items-center gap-3 mb-6">
                  <Unlock size={20} className="text-primary" />
                  <h3 className="text-xl font-semibold">Extract Settings</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Decryption Password</label>
                    <div className="flex items-center gap-3 rounded-xl bg-surface/70 p-4 border border-white/10">
                      <Key size={16} className="text-muted" />
                      <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Enter password if encrypted" 
                        className="w-full bg-transparent outline-none text-sm" 
                      />
                    </div>
                  </div>
                  
                  <motion.button 
                    whileTap={{ scale: 0.98 }} 
                    whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0, 224, 199, 0.3)" }}
                    disabled={busy} 
                    onClick={startExtract} 
                    className="w-full btn-glow rounded-xl bg-primary/90 px-6 py-4 text-bg font-medium shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? "Extracting..." : "Start Extraction"}
                  </motion.button>
              </div>
            </>
          )}
        </div>
      </motion.div>

        {/* Results Section */}
      {(resultText || resultUrl) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass rounded-2xl p-8 shadow-glass"
          >
            <div className="flex items-center gap-3 mb-6">
              <Download size={20} className="text-primary" />
              <h3 className="text-xl font-semibold">Results</h3>
            </div>
            
          {resultText && (
              <div className="mb-6 rounded-xl bg-surface/70 p-6 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted">Extracted Text:</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(resultText)} 
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/5 transition-colors"
                  >
                    <Copy size={14} /> Copy
              </button>
            </div>
                <div className="font-mono text-sm whitespace-pre-wrap bg-bg/50 p-4 rounded-lg">
                  {resultText}
                </div>
        </div>
      )}

            {resultUrl && (
              <div className="flex gap-4">
                <a 
                  href={resultUrl} 
                  download="stegolsb_output.png" 
                  className="inline-flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-6 py-3 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all"
                >
                  <Download size={18} /> Download Result
                </a>
                <button
                  onClick={clearResults}
                  className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-muted hover:bg-white/10 hover:text-white transition-all"
                >
                  <Trash2 size={18} /> Clear Results
                </button>
        </div>
            )}
          </motion.div>
      )}
    </section>

      {/* Toast Notification */}
      <Toast 
        type={toast.type}
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}


