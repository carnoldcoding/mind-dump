import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TrustedDeviceProvider } from './context/TrustedDeviceContext.tsx'

createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <TrustedDeviceProvider>
          <App />
        </TrustedDeviceProvider>
      </StrictMode>,
)
