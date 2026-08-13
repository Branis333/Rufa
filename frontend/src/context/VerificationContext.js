import React, { createContext, useContext, useState } from 'react';

const VerificationContext = createContext(null);

const PENDING_REVIEW_MS = 5000;

export function VerificationProvider({ children }) {
  const [status, setStatus] = useState('unverified');

  const requestVerification = () => {
    setStatus('pending');
    setTimeout(() => {
      setStatus('verified');
    }, PENDING_REVIEW_MS);
  };

  return (
    <VerificationContext.Provider value={{ status, requestVerification }}>
      {children}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}
