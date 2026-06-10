import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import ErrorBoundary from './lib/ErrorBoundary.jsx'
import './index.css'

// Apply saved theme BEFORE first paint. Class-driven only — never auto-detect
// system preference, so there is no dark-mode flicker on load.
try {
  const theme = localStorage.getItem('goodseed_theme')
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  }
} catch {
  /* localStorage unavailable — default to light */
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 0 },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

// Register the service worker for offline / installable PWA (production only,
// so it never interferes with the Vite dev HMR server).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('SW registration failed', err)
    })
  })
}
