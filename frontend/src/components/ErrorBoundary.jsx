import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div className="card" style={{ maxWidth: 540, margin: '0 auto', padding: '32px' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>⚠️</span>
            <h2 style={{ marginBottom: 8, color: '#d93025' }}>Đã xảy ra lỗi hiển thị</h2>
            <p style={{ color: '#5f6368', marginBottom: 20, fontSize: 14 }}>
              {this.state.error?.message || 'Có lỗi ngoài ý muốn khi tải giao diện.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={this.handleReload}
              >
                🔄 Thử tải lại trang
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={this.handleGoDashboard}
              >
                🏠 Về trang Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

