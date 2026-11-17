/**
 * EmptyState — displayed when a list/query returns no results.
 * Props:
 *   title   {string}   - heading text (default: "Không có dữ liệu")
 *   message {string}   - descriptive sub-text
 *   action  {ReactNode} - optional action button/link
 *   icon    {string}   - emoji or unicode icon (default: "📭")
 */
export default function EmptyState({
  title = 'Không có dữ liệu',
  message = 'Chưa có mục nào để hiển thị.',
  action,
  icon = '📭',
}) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon" aria-hidden="true">{icon}</span>
      <h3 className="empty-state__title">{title}</h3>
      {message && <p className="empty-state__message">{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
