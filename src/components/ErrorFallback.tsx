import './ErrorFallback.css';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="error-fallback">
      <div className="error-fallback-inner">
        <p className="error-fallback-symbol">&#x2738;</p>
        <h2 className="error-fallback-title">The stars have scattered</h2>
        <p className="error-fallback-message">
          Something unexpected disrupted the cosmic flow. The Seer will recover.
        </p>
        {import.meta.env.DEV && (
          <pre className="error-fallback-detail">{error.message}</pre>
        )}
        <button className="error-fallback-btn" onClick={resetError}>
          Realign
        </button>
      </div>
    </div>
  );
}
