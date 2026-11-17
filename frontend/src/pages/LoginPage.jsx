import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load saved username on mount
  useEffect(() => {
    const saved = localStorage.getItem('saved_username');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const handleOpenLogin = () => {
    setError(null);
    setShowLoginModal(true);
  };

  const handleCloseLogin = () => {
    setShowLoginModal(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('saved_username', cleanUsername);
    } else {
      localStorage.removeItem('saved_username');
    }

    setIsLoading(true);
    const result = await login(cleanUsername, password);
    setIsLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    // Redirect based on role
    const userRoles = result?.roles || [];
    if (userRoles.includes('CUSTOMER')) {
      navigate('/portal', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="landing-page">
      {/* 1. TOP NAVBAR VỚI NÚT ĐĂNG NHẬP Ở GÓC TRÊN CÙNG BÊN PHẢI */}
      <header className="landing-navbar">
        <Link to="/" className="landing-navbar__brand">
          <div className="landing-navbar__logo-icon">⚡</div>
          <div>
            <div className="landing-navbar__brand-name">Vua Sửa Chữa</div>
            <div className="landing-navbar__brand-tagline">Hệ thống Sửa chữa & Bảo dưỡng Điện Lạnh</div>
          </div>
        </Link>

        {/* Center navigation links */}
        <nav className="landing-navbar__nav" aria-label="Menu giới thiệu">
          <a href="#services" className="landing-navbar__link">Dịch vụ sửa chữa</a>
          <a href="#workflow" className="landing-navbar__link">Quy trình chuẩn</a>
          <a href="#devices" className="landing-navbar__link">Dòng máy tiếp nhận</a>
          <span className="text-muted text-xs">|</span>
          <span className="text-sm font-semibold" style={{ color: '#0284c7' }}>
            📞 Hotline: 1900 6868
          </span>
        </nav>

        {/* Top Right Action Buttons */}
        <div className="landing-navbar__actions">
          <Link to="/register" className="landing-navbar__btn-register">
            Đăng ký khách hàng
          </Link>
          <button
            type="button"
            className="landing-navbar__btn-login"
            onClick={handleOpenLogin}
          >
            <span>🔑</span>
            <span>Đăng nhập</span>
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION GIỚI THIỆU HỆ THỐNG */}
      <section className="landing-hero">
        <div className="landing-hero__badge">
          <span>⚡</span>
          <span>NỀN TẢNG QUẢN LÝ SỬA CHỮA ĐIỆN MÁY CHUYÊN NGHIỆP</span>
        </div>

        <h1 className="landing-hero__title">
          Dịch Vụ Sửa Chữa & Bảo Dưỡng{' '}
          <span className="landing-hero__title-gradient">Điện Máy — Điện Lạnh Uy Tín</span>
        </h1>

        <p className="landing-hero__desc">
          Chuyên sửa chữa Điều hòa, Tủ lạnh, Máy giặt, Bình nóng lạnh và Thiết bị gia dụng.
          Tiếp nhận nhanh chóng, chẩn đoán chính xác, <strong>báo giá minh bạch 2 tầng duyệt</strong> trước khi sửa, linh kiện chính hãng 100%.
        </p>

        <div className="landing-hero__cta-group">
          <button
            type="button"
            className="btn btn--primary"
            style={{ padding: '12px 28px', fontSize: '15.5px', borderRadius: '10px' }}
            onClick={handleOpenLogin}
          >
            🔑 Đăng nhập vào hệ thống ➔
          </button>
          <Link
            to="/register"
            className="btn btn--outline font-semibold"
            style={{ padding: '12px 24px', fontSize: '15.5px', borderRadius: '10px' }}
          >
            📱 Đặt lịch sửa chữa (Đăng ký)
          </Link>
        </div>

        <div className="landing-hero__trust-badges">
          <div className="trust-badge-item">
            <span style={{ color: '#10b981' }}>✓</span> Kiểm tra & Chẩn đoán tận nơi
          </div>
          <div className="trust-badge-item">
            <span style={{ color: '#10b981' }}>✓</span> Khách duyệt giá mới bắt đầu sửa
          </div>
          <div className="trust-badge-item">
            <span style={{ color: '#10b981' }}>✓</span> Linh kiện chính hãng & Trừ kho nguyên tử
          </div>
          <div className="trust-badge-item">
            <span style={{ color: '#10b981' }}>✓</span> Xuất hóa đơn VAT & Bảo hành điện tử
          </div>
        </div>
      </section>

      {/* 3. DÒNG MÁY TIẾP NHẬN SỬA CHỮA */}
      <section id="devices" className="landing-section">
        <div className="landing-section__header">
          <span className="landing-section__badge">DANH MỤC THIẾT BỊ</span>
          <h2 className="landing-section__title">Các dòng máy trung tâm tiếp nhận sửa chữa</h2>
          <p className="landing-section__subtitle">
            Hỗ trợ tất cả các thương hiệu hàng đầu: Daikin, Panasonic, LG, Electrolux, Toshiba, Casper, v.v.
          </p>
        </div>

        <div className="landing-devices-grid">
          <div className="landing-device-item">
            <span className="landing-device-item__icon">❄️</span>
            <div className="landing-device-item__name">Điều hòa không khí</div>
            <div className="landing-device-item__sub">Inverter, Treo tường, Âm trần</div>
          </div>
          <div className="landing-device-item">
            <span className="landing-device-item__icon">🧊</span>
            <div className="landing-device-item__name">Tủ lạnh & Tủ đông</div>
            <div className="landing-device-item__sub">Side-by-side, Inverter 2 cánh</div>
          </div>
          <div className="landing-device-item">
            <span className="landing-device-item__icon">🧺</span>
            <div className="landing-device-item__name">Máy giặt & Máy sấy</div>
            <div className="landing-device-item__sub">Cửa ngang, Cửa trên lồng đứng</div>
          </div>
          <div className="landing-device-item">
            <span className="landing-device-item__icon">💧</span>
            <div className="landing-device-item__name">Bình nóng lạnh</div>
            <div className="landing-device-item__sub">Gián tiếp, Trực tiếp chống giật</div>
          </div>
          <div className="landing-device-item">
            <span className="landing-device-item__icon">🍳</span>
            <div className="landing-device-item__name">Bếp từ & Lò vi sóng</div>
            <div className="landing-device-item__sub">Bếp từ đôi, Lò vi sóng nướng</div>
          </div>
          <div className="landing-device-item">
            <span className="landing-device-item__icon">💨</span>
            <div className="landing-device-item__name">Máy hút mùi & Lọc khí</div>
            <div className="landing-device-item__sub">Thiết bị điện gia dụng cao cấp</div>
          </div>
        </div>
      </section>

      {/* 4. TÍNH NĂNG VƯỢT TRỘI CỦA HỆ THỐNG */}
      <section id="services" className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-section__header">
          <span className="landing-section__badge">ƯU ĐIỂM DỊCH VỤ</span>
          <h2 className="landing-section__title">4 Trụ cột cam kết chất lượng dịch vụ</h2>
          <p className="landing-section__subtitle">
            Hệ thống quản lý chuẩn hóa 6 vai trò đảm bảo mỗi chiếc máy đều được chăm sóc tận tâm.
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-card__icon">📱</div>
            <h3 className="landing-feature-card__title">Tiếp nhận đa kênh thuận tiện</h3>
            <p className="landing-feature-card__desc">
              Khách hàng có thể đặt lịch hẹn tại nhà qua Cổng khách hàng trực tuyến hoặc đến trực tiếp tại quầy tiếp nhận.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-card__icon">⚖️</div>
            <h3 className="landing-feature-card__title">Báo giá 2 tầng minh bạch</h3>
            <p className="landing-feature-card__desc">
              Kỹ thuật viên lập báo giá ➔ Admin duyệt phương án ➔ Khách hàng xác nhận mới sửa. Tuyệt đối không tự ý phát sinh chi phí.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-card__icon">🔧</div>
            <h3 className="landing-feature-card__title">Kỹ thuật viên chuyên môn cao</h3>
            <p className="landing-feature-card__desc">
              Đội ngũ kỹ thuật viên tay nghề chuẩn hóa, cập nhật nhật ký sửa chữa chi tiết và đối chiếu hình ảnh trước/sau sửa.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-card__icon">📦</div>
            <h3 className="landing-feature-card__title">Kho linh kiện chính hãng</h3>
            <p className="landing-feature-card__desc">
              Thủ kho kiểm soát tồn kho chặt chẽ, cấp phát nguyên tử theo từng phiếu, xuất hóa đơn và phiếu bảo hành điện tử.
            </p>
          </div>
        </div>
      </section>

      {/* 5. QUY TRÌNH 4 BƯỚC ĐƠN GIẢN */}
      <section id="workflow" className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-section__header">
          <span className="landing-section__badge">QUY TRÌNH TIẾP NHẬN</span>
          <h2 className="landing-section__title">4 Bước sửa chữa máy móc nhanh gọn</h2>
          <p className="landing-section__subtitle">
            Khách hàng luôn chủ động nắm bắt tình trạng thiết bị theo thời gian thực.
          </p>
        </div>

        <div className="landing-workflow-grid">
          <div className="landing-step-card">
            <span className="landing-step-number">01</span>
            <h3 className="landing-step-title">Gửi yêu cầu sửa chữa</h3>
            <p className="landing-step-desc">
              Khách hàng tạo yêu cầu online hoặc gọi hotline 1900 6868. Lễ tân tiếp nhận ngay trong 15 phút.
            </p>
          </div>

          <div className="landing-step-card">
            <span className="landing-step-number">02</span>
            <h3 className="landing-step-title">Chẩn đoán & Lập báo giá</h3>
            <p className="landing-step-desc">
              Kỹ thuật viên kiểm tra thiết bị, đề xuất phương án và lập bảng báo giá chi tiết gồm công thợ và linh kiện.
            </p>
          </div>

          <div className="landing-step-card">
            <span className="landing-step-number">03</span>
            <h3 className="landing-step-title">Khách hàng duyệt báo giá</h3>
            <p className="landing-step-desc">
              Sau khi Admin thẩm định, khách hàng kiểm tra báo giá trên điện thoại và xác nhận đồng ý thì thợ mới tiến hành sửa.
            </p>
          </div>

          <div className="landing-step-card">
            <span className="landing-step-number">04</span>
            <h3 className="landing-step-title">Nghiệm thu & Bàn giao</h3>
            <p className="landing-step-desc">
              Khách hàng kiểm tra máy hoạt động êm ái, kế toán xuất hóa đơn và bàn giao thiết bị kèm bảo hành điện tử.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FOOTER THÔNG TIN TRUNG TÂM */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div>
            <div className="landing-footer__brand">👑 Vua Sửa Chữa</div>
            <div className="text-sm mt-1" style={{ color: '#cbd5e1' }}>
              Trung tâm Dịch vụ Sửa chữa & Bảo dưỡng Thiết bị Điện máy — Điện lạnh
            </div>
            <div className="text-xs mt-2" style={{ color: '#94a3b8' }}>
              Hệ thống chi nhánh: Hà Nội (Cầu Giấy, Giải Phóng) — TP.HCM (Quận 1, Tân Bình) — Đà Nẵng
            </div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: '#ffffff', fontSize: '15px' }}>
              Tổng đài tư vấn & Hỗ trợ 24/7
            </div>
            <div className="font-semibold text-lg mt-1" style={{ color: '#38bdf8' }}>
              📞 1900 6868 — 0988.123.456
            </div>
            <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              Giờ làm việc: 7:30 - 21:00 (Tất cả các ngày trong tuần)
            </div>
          </div>
        </div>
        <div className="landing-footer__copy">
          © 2026 Vua Sửa Chữa. Bản quyền thuộc về Hệ thống Quản trị & Sửa chữa Thiết bị Điện Lạnh.
        </div>
      </footer>

      {/* 7. LOGIN MODAL (HIỆN KHI BẤM NÚT ĐĂNG NHẬP Ở GÓC TRÊN CÙNG BÊN PHẢI) */}
      {showLoginModal && (
        <div className="login-modal-backdrop" onClick={handleCloseLogin}>
          <div className="login-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Top Accent Gradient Bar */}
            <div className="login-card__top-bar" aria-hidden="true" />

            {/* Nút đóng modal */}
            <button
              type="button"
              className="login-modal__close-btn"
              onClick={handleCloseLogin}
              title="Đóng cửa sổ"
              aria-label="Close login dialog"
            >
              ✕
            </button>

            {/* Header */}
            <div className="login-card__header mb-4">
              <div className="login-card__logo-wrap" style={{ width: 48, height: 48 }}>
                <span className="login-card__logo-icon" style={{ fontSize: 24 }}>⚡</span>
              </div>
              <h2 className="login-card__title" style={{ fontSize: 22 }}>Đăng nhập hệ thống</h2>
              <p className="login-card__subtitle">
                Đăng nhập tài khoản nhân viên hoặc khách hàng
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="form-error mb-3" role="alert">
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <div>{error}</div>
              </div>
            )}

            {/* Form đăng nhập sạch sẽ, không có chọn theo vai trò */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group mb-3">
                <label htmlFor="modal-username" className="form-label font-semibold">
                  Tên đăng nhập
                </label>
                <div className="input-with-icon-wrap">
                  <span className="input-leading-icon" aria-hidden="true">👤</span>
                  <input
                    id="modal-username"
                    type="text"
                    className="form-input has-leading-icon"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    disabled={isLoading}
                    placeholder="Nhập tên đăng nhập"
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-3">
                <label htmlFor="modal-password" className="form-label font-semibold">
                  Mật khẩu
                </label>
                <div className="input-with-icon-wrap">
                  <span className="input-leading-icon" aria-hidden="true">🔒</span>
                  <input
                    id="modal-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input has-leading-icon has-trailing-icon"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isLoading}
                    placeholder="Nhập mật khẩu"
                    required
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

              <div className="remember-me-wrap">
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ tên đăng nhập</span>
                </label>
                <span className="text-xs text-muted">Bảo mật SSL</span>
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
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập vào hệ thống ➔'
                )}
              </button>

              <div className="text-center mt-3 pt-3 border-top text-sm">
                <span className="text-muted">Khách hàng chưa có tài khoản? </span>
                <Link to="/register" className="font-semibold text-primary">
                  Đăng ký ngay ➔
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
