/**
 * LoadingSpinner — full-page or inline loading indicator.
 * Props:
 *   inline {boolean} - if true, renders small inline spinner (default: false = centered full area)
 *   message {string} - optional text below spinner
 */
export default function LoadingSpinner({ inline = false, message = 'Đang tải...' }) {
  if (inline) {
    return (
      <span className="spinner spinner--inline" role="status" aria-label={message}>
        <span className="spinner__circle" />
      </span>
    );
  }

  return (
    <div className="spinner-wrapper" role="status" aria-label={message}>
      <span className="spinner__circle spinner__circle--lg" />
      {message && <p className="spinner__message">{message}</p>}
    </div>
  );
}
