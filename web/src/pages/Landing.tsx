import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  {
    n: '01',
    title: 'Заполните профиль',
    text: 'Уровень, цель, параметры тела и доступный инвентарь — минута на регистрацию.',
  },
  {
    n: '02',
    title: 'Нейросеть строит план',
    text: 'ИИ подбирает тренировку и меню под ваши данные за секунды — без шаблонов.',
  },
  {
    n: '03',
    title: 'Тренируйтесь и следите',
    text: 'Отмечайте подходы и вес — дашборд показывает прогресс за неделю наглядно.',
  },
]

const FEATURES = [
  {
    icon: '🏋️',
    title: 'Персональные тренировки',
    text: 'ИИ составляет программу под ваш уровень, цели и инвентарь — от новичка до продвинутого, с разминкой, техникой и отдыхом.',
  },
  {
    icon: '🥗',
    title: 'AI-Диетолог',
    text: 'Укажите продукты из холодильника — получите план питания с рецептами, пошаговым приготовлением и подсчётом КБЖУ.',
  },
  {
    icon: '📈',
    title: 'Трекинг прогресса',
    text: 'Дневник веса и выполненных тренировок. Наглядная статистика и график динамики прямо на дашборде.',
  },
]

const STATS = [
  { value: '7 сек', label: 'на генерацию плана' },
  { value: '100%', label: 'персонально под вас' },
  { value: '0 ₽', label: 'без абонемента' },
  { value: '24/7', label: 'тренер под рукой' },
]

const TESTIMONIALS = [
  {
    text: 'Раньше не знал, с чего начать в зале. Теперь открываю приложение — и план готов. За 2 месяца минус 5 кг.',
    name: 'Артём',
    role: 'похудение',
  },
  {
    text: 'AI-диетолог реально считает по моим продуктам, а не выдаёт абстрактную «куриную грудку с гречкой». Удобно.',
    name: 'Мария',
    role: 'поддержание формы',
  },
  {
    text: 'Нравится, что можно тренироваться дома без инвентаря. Программа адекватная, прогресс виден на графике.',
    name: 'Денис',
    role: 'набор массы',
  },
]

const FAQ = [
  {
    q: 'Это правда бесплатно?',
    a: 'Да. Регистрация и генерация тренировок и планов питания бесплатны, без привязки карты.',
  },
  {
    q: 'Нужен ли абонемент в зал или инвентарь?',
    a: 'Нет. Можно указать «без инвентаря» — ИИ составит программу с собственным весом для дома.',
  },
  {
    q: 'Насколько персональны планы?',
    a: 'Нейросеть учитывает ваш уровень, цель, возраст, вес, рост и доступные продукты — каждый план уникален.',
  },
  {
    q: 'Мои данные в безопасности?',
    a: 'Пароли хранятся в виде хэша, доступ к данным — только по защищённому токену. Мы не передаём данные третьим лицам.',
  },
]

/** Стилизованный мокап приложения для hero — без внешних картинок. */
function AppMockup() {
  return (
    <div className="mockup" aria-hidden="true">
      <div className="mockup-bar">
        <span className="mockup-dot" />
        <span className="mockup-dot" />
        <span className="mockup-dot" />
        <span className="mockup-url">fitai.app/dashboard</span>
      </div>
      <div className="mockup-body">
        <div className="mockup-stats">
          <div className="mockup-stat">
            <span className="mockup-stat-label">Вес</span>
            <span className="mockup-stat-value">78.4</span>
          </div>
          <div className="mockup-stat">
            <span className="mockup-stat-label">За неделю</span>
            <span className="mockup-stat-value accent">−0.6</span>
          </div>
          <div className="mockup-stat">
            <span className="mockup-stat-label">Тренировок</span>
            <span className="mockup-stat-value">4</span>
          </div>
        </div>
        <div className="mockup-chart">
          <svg viewBox="0 0 260 90" preserveAspectRatio="none">
            <polyline
              className="mockup-area"
              points="0,70 40,60 80,64 120,48 160,52 200,34 260,30 260,90 0,90"
            />
            <polyline
              className="mockup-line"
              points="0,70 40,60 80,64 120,48 160,52 200,34 260,30"
            />
          </svg>
        </div>
        <div className="mockup-workout">
          <div className="mockup-workout-head">
            <span className="mockup-badge">🏋️ Тренировка дня</span>
            <span className="mockup-muted">45 мин</span>
          </div>
          <div className="mockup-row">
            <span>Приседания</span>
            <span className="mockup-muted">4 × 12–15</span>
          </div>
          <div className="mockup-row">
            <span>Отжимания</span>
            <span className="mockup-muted">4 × 12–15</span>
          </div>
          <div className="mockup-row">
            <span>Планка</span>
            <span className="mockup-muted">4 × 30–60 сек</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const { user } = useAuth()
  const ctaTo = user ? '/dashboard' : '/auth'
  const ctaText = user ? 'Перейти в кабинет' : 'Начать бесплатно'

  return (
    <div className="landing">
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="hero-inner landing-container">
          <div className="hero-content">
            <span className="badge">✨ На базе нейросети GPT-4</span>
            <h1>
              Персональный <span className="accent">AI-тренер</span>
              <br />и диетолог в кармане
            </h1>
            <p className="hero-sub">
              Нейросеть составит тренировку и план питания за секунды — персонально под ваши цели,
              уровень и продукты. Без абонемента, без записи, бесплатно.
            </p>
            <div className="hero-cta">
              <Link to={ctaTo} className="btn btn-primary btn-lg">
                {ctaText}
              </Link>
              <a href="#how" className="btn btn-ghost btn-lg">
                Как это работает
              </a>
            </div>
            <p className="hero-trust">Бесплатно · Без карты · Готовый план за 7 секунд</p>
          </div>
          <div className="hero-visual">
            <AppMockup />
          </div>
        </div>
      </section>

      {/* ---------- ЦИФРЫ ---------- */}
      <section className="stats-band">
        <div className="landing-container stats-band-inner">
          {STATS.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-num">{s.value}</div>
              <div className="stat-cap">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- КАК ЭТО РАБОТАЕТ ---------- */}
      <section id="how" className="section landing-container">
        <div className="section-head">
          <h2>Как это работает</h2>
          <p className="section-sub">Три шага от регистрации до первой тренировки</p>
        </div>
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.n} className="step-card">
              <div className="step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ФИЧИ ---------- */}
      <section className="section landing-container">
        <div className="section-head">
          <h2>Всё для формы в одном месте</h2>
          <p className="section-sub">Тренировки, питание и прогресс — под управлением ИИ</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- ОТЗЫВЫ ---------- */}
      <section className="section landing-container">
        <div className="section-head">
          <h2>Что говорят пользователи</h2>
        </div>
        <div className="testimonials">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="testimonial">
              <blockquote>«{t.text}»</blockquote>
              <figcaption>
                <span className="testimonial-avatar">{t.name[0]}</span>
                <span>
                  <strong>{t.name}</strong>
                  <span className="muted"> · {t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- ТАРИФ / CTA ---------- */}
      <section className="section landing-container">
        <div className="pricing-card">
          <div className="pricing-info">
            <span className="badge">Тариф</span>
            <h2>Бесплатно. Навсегда.</h2>
            <p className="section-sub">
              Все возможности без ограничений: генерация тренировок и планов питания, дневник и
              статистика. Платим за ИИ мы — вы просто тренируетесь.
            </p>
            <ul className="pricing-list">
              <li>Безлимитная генерация тренировок</li>
              <li>AI-планы питания по вашим продуктам</li>
              <li>Дневник веса и график прогресса</li>
              <li>Тёмная тема и работа с телефона</li>
            </ul>
          </div>
          <div className="pricing-cta">
            <div className="pricing-price">
              0 ₽<span>/ месяц</span>
            </div>
            <Link to={ctaTo} className="btn btn-primary btn-lg">
              {ctaText}
            </Link>
            <p className="muted">Без карты и скрытых платежей</p>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section landing-container">
        <div className="section-head">
          <h2>Частые вопросы</h2>
        </div>
        <div className="faq">
          {FAQ.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- ФИНАЛЬНЫЙ CTA ---------- */}
      <section className="final-cta">
        <div className="landing-container">
          <h2>Начните тренироваться умнее уже сегодня</h2>
          <p>Ваш персональный план — в паре кликов. Бесплатно.</p>
          <Link to={ctaTo} className="btn btn-primary btn-lg">
            {ctaText}
          </Link>
        </div>
      </section>

      {/* ---------- ФУТЕР ---------- */}
      <footer className="footer">
        <div className="landing-container footer-inner">
          <div className="footer-brand">
            <strong>FitAI</strong>
            <span className="muted">AI-тренер и диетолог</span>
          </div>
          <nav className="footer-links">
            <a href="#how">Как это работает</a>
            <Link to={ctaTo}>Начать</Link>
          </nav>
          <span className="muted">© 2026 FitAI</span>
        </div>
      </footer>
    </div>
  )
}
