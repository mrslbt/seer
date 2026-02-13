import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import { I18nProvider } from './i18n/I18nContext'
import { ErrorFallback } from './components/ErrorFallback'
import { initSentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'
import './index.css'

initSentry()
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error as Error} resetError={resetError} />
      )}
    >
      <I18nProvider>
        <App />
      </I18nProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
