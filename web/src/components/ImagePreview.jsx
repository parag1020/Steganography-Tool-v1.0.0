import React from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon } from 'lucide-react';

const ImagePreview = ({ image, previewUrl, onClear, className = "" }) => {
  if (!image || !previewUrl) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group ${className}`}
    >
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-surface/50">
        <img 
          src={previewUrl} 
          alt="Preview" 
          className="w-full h-32 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        >
          <X size={14} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <ImageIcon size={12} />
        <span>{image.width} × {image.height}</span>
      </div>
    </motion.div>
  );
};

export default ImagePreview;


