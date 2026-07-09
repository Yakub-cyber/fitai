import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { LogEntry, Stats, WorkoutDoc } from '../api/types'
import { Skeleton } from '../components/Skeleton'
import { WeightChart } from '../components/WeightChart'
import { useAuth } from '../context/AuthContext'

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [lastWorkout, setLastWorkout] = useState<WorkoutDoc | null | undefined>(undefined)
  const [weightLog, setWeightLog] = useState<LogEntry[]>([])
  const [weightInput, setWeightInput] = useState('')
  const [message, setMessage] = useState('')

  const loadStats = useCallback(() => {
    api<Stats>('/logs/stats').then(setStats).catch(() => setStats(null))
    api<LogEntry[]>('/logs?type=weight').then(setWeightLog).catch(() => setWeightLog([]))
  }, [])

  useEffect(() => {
    loadStats()
    api<WorkoutDoc[]>('/workouts')
      .then((list) => setLastWorkout(list[0] ?? null))
      .catch(() => setLastWorkout(null))
  }, [loadStats])

  const logWeight = async (e: FormEvent) => {
    e.preventDefault()
    const weight = Number(weightInput)
    if (!weight) return
    try {
      await api('/logs', { body: { type: 'weight', weight } })
      setWeightInput('')
      setMessage('Вес записан ✓')
      setTimeout(() => setMessage(''), 3000)
      loadStats()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка')
    }
  }

  const changeLabel =
    stats?.weightChangeWeek == null
      ? '—'
      : `${stats.weightChangeWeek > 0 ? '+' : ''}${stats.weightChangeWeek} кг`

  return (
    <div className="page">
      <h1>Привет, {user?.name}! 👋</h1>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Текущий вес</div>
          {stats ? (
            <div className="stat-value">{stats.currentWeight != null ? `${stats.currentWeight} кг` : '—'}</div>
          ) : (
            <Skeleton className="skeleton-stat" />
          )}
        </div>
        <div className="card stat-card">
          <div className="stat-label">Динамика за неделю</div>
          {stats ? <div className="stat-value">{changeLabel}</div> : <Skeleton className="skeleton-stat" />}
        </div>
        <div className="card stat-card">
          <div className="stat-label">Тренировок за неделю</div>
          {stats ? <div className="stat-value">{stats.workoutsThisWeek}</div> : <Skeleton className="skeleton-stat" />}
        </div>
      </div>

      <div className="card">
        <h3>Динамика веса</h3>
        <WeightChart entries={weightLog} />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Записать вес</h3>
          <form className="inline-form" onSubmit={logWeight}>
            <input
              type="number"
              min={20}
              max={400}
              step="0.1"
              placeholder="Вес, кг"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              required
            />
            <button className="btn btn-primary" type="submit">
              Записать
            </button>
          </form>
          {message && <p className="form-hint">{message}</p>}
        </div>

        <div className="card">
          <h3>Сегодняшняя тренировка</h3>
          {lastWorkout === undefined && <Skeleton className="skeleton-line" />}
          {lastWorkout === null && (
            <p className="muted">
              Пока нет тренировок. <Link to="/workouts">Сгенерировать первую →</Link>
            </p>
          )}
          {lastWorkout && (
            <>
              <p>
                <strong>{lastWorkout.plan.title}</strong>
                <br />
                <span className="muted">
                  {lastWorkout.plan.exercises.length} упражнений · ~{lastWorkout.plan.durationMinutes} мин
                </span>
              </p>
              <Link to="/workouts" className="btn btn-primary">
                К тренировке →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
