import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth.js';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    const res = await register({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim() || undefined,
      username: form.username.trim(),
      password: form.password,
    });
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        {/* Top Accent Gradient Bar */}
        <div className="login-card__top-bar" aria-hidden="true" />

        <div className="login-card__header">
          <div className="login-card__logo-wrap">
            <span className="login-card__logo-icon" aria-hidden="true">⚡</span>
          </div>
          <h1 className="login-card__title">Đăng ký tài khoản khách hàng</h1>
          <p className="login-card__subtitle">
            Tạo tài khoản để đặt lịch sửa chữa, theo dõi tiến độ và duyệt báo giá trực tuyến
          </p>
        </div>

        {error && (
          <div className="form-error" role="alert">
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="alert alert--success mb-4 p-3 rounded text-center font-semibold">
            <span>✓</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group mb-3">
            <label htmlFor="reg-name" className="form-label font-semibold">
              Họ và tên khách hàng *
            </label>
            <div className="input-with-icon-wrap">
              <span className="input-leading-icon" aria-hidden="true">👤</span>
              <input
                id="reg-name"
                type="text"
                required
                className="form-input has-leading-icon"
                placeholder="Ví dụ: Nguyễn Văn An"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid-2-cols gap-3 mb-3">
            <div className="form-group">
              <label htmlFor="reg-phone" className="form-label font-semibold">
                Số điện thoại *
              </label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon" aria-hidden="true">📱</span>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  className="form-input has-leading-icon"
                  placeholder="0912345678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-user" className="form-label font-semibold">
                Tên đăng nhập *
              </label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon" aria-hidden="true">🆔</span>
                <input
                  id="reg-user"
                  type="text"
                  required
                  className="form-input has-leading-icon"
                  placeholder="nguyenvanan"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="form-group mb-3">
            <label htmlFor="reg-address" className="form-label font-semibold">
              Địa chỉ phục vụ tại nhà (Số nhà, đường, quận/huyện)
            </label>
            <div className="input-with-icon-wrap">
              <span className="input-leading-icon" aria-hidden="true">🏠</span>
              <input
                id="reg-address"
                type="text"
                className="form-input has-leading-icon"
                placeholder="Số 123 Đường Cầu Giấy, Hà Nội..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid-2-cols gap-3 mb-4">
            <div className="form-group">
              <label htmlFor="reg-pass" className="form-label font-semibold">
                Mật khẩu (≥ 6 ký tự) *
              </label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon" aria-hidden="true">🔒</span>
                <input
                  id="reg-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="form-input has-leading-icon has-trailing-icon"
                  placeholder="Tối thiểu 6 ký tự"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="input-trailing-action"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label="Toggle password visibility"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm" className="form-label font-semibold">
                Xác nhận mật khẩu *
              </label>
              <div className="input-with-icon-wrap">
                <span className="input-leading-icon" aria-hidden="true">🔒</span>
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="form-input has-leading-icon has-trailing-icon"
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="input-trailing-action"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label="Toggle confirm password visibility"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full font-semibold"
            disabled={isLoading}
            style={{ padding: '12px 16px', fontSize: '15px' }}
          >
            {isLoading ? (
              <>
                <span className="spinner spinner--inline" aria-hidden="true">
                  <span className="spinner__circle" />
                </span>{' '}
                Đang tạo tài khoản...
              </>
            ) : (
              'Hoàn tất đăng ký tài khoản ➔'
            )}
          </button>

          <div className="text-center mt-4 pt-3 border-top text-sm">
            <span className="text-muted">Đã có tài khoản? </span>
            <Link to="/login" className="font-semibold text-primary">
              Đăng nhập ngay ➔
            </Link>
          </div>
        </form>
      </div>

      <footer className="login-footer-info">
        <div>📞 Hotline hỗ trợ khách hàng: <strong>1900 6868</strong> (7:30 - 21:00 hàng ngày)</div>
        <div className="mt-1">© 2026 Vua Sửa Chữa — Dịch vụ sửa chữa uy tín, chuyên nghiệp</div>
      </footer>
    </div>
  );
}
