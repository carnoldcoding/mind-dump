import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { backend } from '../api/backend';

interface TrustedDeviceContextType {
  trusted: boolean;
  loading: boolean;
}

const TrustedDeviceContext = createContext<TrustedDeviceContextType | undefined>(undefined);

export const TrustedDeviceProvider = ({ children }: { children: ReactNode }) => {
  const [trusted, setTrusted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.probeTrustedDevice()
      .then(setTrusted)
      .finally(() => setLoading(false));
  }, []);

  return (
    <TrustedDeviceContext.Provider value={{ trusted, loading }}>
      {children}
    </TrustedDeviceContext.Provider>
  );
};

export const useTrustedDevice = () => {
  const context = useContext(TrustedDeviceContext);
  if (!context) {
    throw new Error('useTrustedDevice must be used within TrustedDeviceProvider');
  }
  return context;
};
