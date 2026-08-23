import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { backend } from '../api/backend';

interface TrustedDeviceContextType {
  trusted: boolean;
  loading: boolean;
}

const TrustedDeviceContext = createContext<TrustedDeviceContextType | undefined>(undefined);

// Last known trust result, cached so a returning trusted device can seed the
// initial state synchronously — before the boot timeline binds its nav-item
// animation at build time. Without it, trust arrives from the async probe a
// beat later, after the timeline is already built, and the System tab it gates
// mounts too late to join the fade-and-slide (it pops in at full opacity).
// This is a UI hint only; real gating is server-side (see config.ts / ADR-0001),
// so a stale cache costs at most one frame the probe then corrects.
const TRUST_CACHE_KEY = 'md:trusted-device';

const readCachedTrust = (): boolean => {
  try {
    return localStorage.getItem(TRUST_CACHE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const TrustedDeviceProvider = ({ children }: { children: ReactNode }) => {
  const [trusted, setTrusted] = useState(readCachedTrust);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backend.probeTrustedDevice()
      .then((result) => {
        setTrusted(result);
        try {
          localStorage.setItem(TRUST_CACHE_KEY, String(result));
        } catch {
          // Storage unavailable (private mode, disabled) — the probe result
          // still applies this session; only the next-load head start is lost.
        }
      })
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
