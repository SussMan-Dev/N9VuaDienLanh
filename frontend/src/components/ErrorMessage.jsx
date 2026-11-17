/**
 * ErrorMessage — displays an API or validation error.
 * Props:
 *   message {string}  - error text
 *   onRetry {Function} - optional retry callback; shows "Thử lại" button
 */
export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-message" role="alert">
      <span className="error-message__icon">⚠</span>
      <span className="error-message__text">{message}</span>
      {onRetry && (
        <button className="btn btn--sm btn--outline" onClick={onRetry} type="button">
          Thử lại
        </button>
      )}
    </div>
  );
}
