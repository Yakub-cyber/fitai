import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    weight: '',
    height: '',
    fitnessLevel: 'beginner' as const,
    goal: 'Поддержание формы',
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register({
          email: form.email,
          password: form.password,
          name: form.name,
          age: form.age ? Number(form.age) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
          height: form.height ? Number(form.height) : undefined,
          fitnessLevel: form.fitnessLevel,
          goal: form.goal,
        })
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>

        <label>
          Email
          <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </label>
        <label>
          Пароль
          <input type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="Минимум 6 символов" />
        </label>

        {mode === 'register' && (
          <>
            <label>
              Имя
              <input required value={form.name} onChange={set('name')} placeholder="Как к вам обращаться" />
            </label>
            <div className="form-row">
              <label>
                Возраст
                <input type="number" min={10} max={120} value={form.age} onChange={set('age')} />
              </label>
              <label>
                Вес, кг
                <input type="number" min={20} max={400} step="0.1" value={form.weight} onChange={set('weight')} />
              </label>
              <label>
                Рост, см
                <input type="number" min={100} max={250} value={form.height} onChange={set('height')} />
              </label>
            </div>
            <label>
              Уровень подготовки
              <select value={form.fitnessLevel} onChange={set('fitnessLevel')}>
                <option value="beginner">Новичок</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </label>
            <label>
              Цель
              <select value={form.goal} onChange={set('goal')}>
                <option>Похудение</option>
                <option>Поддержание формы</option>
                <option>Набор мышечной массы</option>
              </select>
            </label>
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>

        <p className="auth-switch">
          {mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </form>
    </div>
  )
}
