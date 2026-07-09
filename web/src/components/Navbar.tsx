import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
        Fit<span className="accent">AI</span>
      </Link>

      {user && (
        <nav className="navbar-links">
          <NavLink to="/dashboard">Дашборд</NavLink>
          <NavLink to="/workouts">Тренировки</NavLink>
          <NavLink to="/diet">AI-Диетолог</NavLink>
        </nav>
      )}

      <div className="navbar-actions">
        <button
          className="btn-icon"
          onClick={toggle}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {user ? (
          <>
            <span className="navbar-user">{user.name}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Выйти
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn btn-primary">
            Войти
          </Link>
        )}
      </div>
    </header>
  )
}
