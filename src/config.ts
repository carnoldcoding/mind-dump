// src/config.js
const config = {
    apiUri: import.meta.env.VITE_API_URI || 'https://api.syntheticsoul.me/',
    // Gated routes' traffic must actually traverse the tailnet, which apiUri's
    // public hostname doesn't guarantee — see ADR-0001.
    trustedApiUri: import.meta.env.VITE_TRUSTED_API_URI || 'https://webserver.tail75a2e4.ts.net/'
  };

  export default config;