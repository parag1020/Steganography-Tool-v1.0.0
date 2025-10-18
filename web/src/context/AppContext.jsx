import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Image state - shared across tabs
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  
  // Settings state - persist across tabs
  const [bits, setBits] = useState(1);
  const [channel, setChannel] = useState("rgb");
  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState("");
  
  // Results state
  const [resultText, setResultText] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [busy, setBusy] = useState(false);
  
  // Image handling
  const handleImageUpload = useCallback((img, file) => {
    setImage(img);
    setPreviewUrl(URL.createObjectURL(file));
    // Clear previous results when new image is uploaded
    setResultText("");
    setResultUrl("");
  }, []);
  
  const clearImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImage(null);
    setPreviewUrl("");
    setResultText("");
    setResultUrl("");
  }, [previewUrl]);
  
  const clearResults = useCallback(() => {
    setResultText("");
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setResultUrl("");
  }, [resultUrl]);
  
  const value = {
    // Image state
    image,
    previewUrl,
    handleImageUpload,
    clearImage,
    
    // Settings state
    bits,
    setBits,
    channel,
    setChannel,
    encrypt,
    setEncrypt,
    password,
    setPassword,
    
    // Results state
    resultText,
    setResultText,
    resultUrl,
    setResultUrl,
    busy,
    setBusy,
    clearResults,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};


