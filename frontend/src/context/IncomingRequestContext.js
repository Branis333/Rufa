import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { resolveRequests } from '../data/mockRequests';
import { useLocation } from './LocationContext';
import { FALLBACK_COORDS } from '../utils/geo';

const IncomingRequestContext = createContext(null);

const FIRST_ALERT_DELAY_MS = 6000;

export function IncomingRequestProvider({ children }) {
  const { location } = useLocation();
  const [incomingRequest, setIncomingRequest] = useState(null);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const current = locationRef.current;
      const anchor =
        current?.latitude != null
          ? { lat: current.latitude, lng: current.longitude }
          : FALLBACK_COORDS;
      setIncomingRequest(resolveRequests(anchor)[0]);
    }, FIRST_ALERT_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  const triggerIncomingRequest = (request) => setIncomingRequest(request);
  const dismissIncomingRequest = () => setIncomingRequest(null);

  return (
    <IncomingRequestContext.Provider
      value={{ incomingRequest, triggerIncomingRequest, dismissIncomingRequest }}
    >
      {children}
    </IncomingRequestContext.Provider>
  );
}

export function useIncomingRequest() {
  const context = useContext(IncomingRequestContext);
  if (!context) {
    throw new Error('useIncomingRequest must be used within an IncomingRequestProvider');
  }
  return context;
}
