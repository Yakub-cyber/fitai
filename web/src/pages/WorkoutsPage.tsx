import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { WorkoutDoc } from '../api/types'
import { Accordion } from '../components/Accordion'
import { ExerciseAnimation } from '../components/ExerciseAnimation'
import { SkeletonCard } from '../components/Skeleton'
import { WorkoutCoach } from '../components/WorkoutCoach'
import { useAuth } from '../context/AuthContext'

const ZONES = ['Грудь', 'Спина', 'Ноги', 'Руки', 'Плечи', 'Пресс', 'Кардио']

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

export function WorkoutsPage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState<WorkoutDoc[] | null>(null)
  const [zones, setZones] = useState<string[]>([])
  const [level, setLevel] = useState(user?.fitnessLevel ?? 'beginner')
  const [duration, setDuration] = useState(45)
  const [equipment, setEquipment] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    api<WorkoutDoc[]>('/workouts')
      .then(setWorkouts)
      .catch(() => setWorkouts([]))
  }, [])

  const toggleZone = (zone: string) =>
    setZones((z) => (z.includes(zone) ? z.filter((x) => x !== zone) : [...z, zone]))

  const generate = async (e: FormEvent) => {
    e.preventDefault()
    if (zones.length === 0) {
      setError('Выберите хотя бы одну зону')
      return
    }
    setError('')
    setGenerating(true)
    try {
      const workout = await api<WorkoutDoc>('/workouts/generate', {
        body: {
          targetZones: zones,
          level,
          durationMinutes: duration,
          equipment: equipment || undefined,
        },
      })
      setWorkouts((w) => [workout, ...(w ?? [])])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации')
    } finally {
      setGenerating(false)
    }
  }

  const markDone = async (id: string) => {
    try {
      await api('/logs', { body: { type: 'workout', workoutId: id } })
      setDoneIds((s) => new Set(s).add(id))
    } catch {
      /* некритично */
    }
  }

  const remove = async (id: string) => {
    await api(`/workouts/${id}`, { method: 'DELETE' })
    setWorkouts((w) => (w ?? []).filter((x) => x._id !== id))
  }

  return (
    <div className="page">
      <h1>Тренировки</h1>

      <form className="card generator-form" onSubmit={generate}>
        <h3>Сгенерировать тренировку</h3>

        <div className="field-label">Целевые зоны</div>
        <div className="chip-group">
          {ZONES.map((zone) => (
            <button
              key={zone}
              type="button"
              className={`chip ${zones.includes(zone) ? 'active' : ''}`}
              onClick={() => toggleZone(zone)}
            >
              {zone}
            </button>
          ))}
        </div>

        <div className="form-row">
          <label>
            Уровень
            <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
              <option value="beginner">Новичок</option>
              <option value="intermediate">Средний</option>
              <option value="advanced">Продвинутый</option>
            </select>
          </label>
          <label>
            Длительность
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={20}>20 минут</option>
              <option value={30}>30 минут</option>
              <option value={45}>45 минут</option>
              <option value={60}>60 минут</option>
            </select>
          </label>
          <label>
            Инвентарь
            <input
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="гантели, резинка… (необязательно)"
            />
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={generating}>
          {generating ? 'Генерирую…' : '⚡ Сгенерировать'}
        </button>
      </form>

      <h2>Мои тренировки</h2>

      {generating && <SkeletonCard lines={5} />}
      {workouts === null && (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}
      {workouts?.length === 0 && !generating && (
        <p className="muted">Сохранённых тренировок пока нет — сгенерируйте первую выше.</p>
      )}

      {workouts?.map((w) => (
        <Accordion
          key={w._id}
          title={w.plan.title}
          subtitle={`${LEVEL_LABELS[w.plan.level] ?? w.plan.level} · ~${w.plan.durationMinutes} мин · ${new Date(w.createdAt).toLocaleDateString('ru-RU')}`}
          actions={
            <>
              <button
                className={`btn btn-sm ${doneIds.has(w._id) ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => markDone(w._id)}
                disabled={doneIds.has(w._id)}
              >
                {doneIds.has(w._id) ? '✓ Выполнена' : 'Отметить выполненной'}
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(w._id)}>
                Удалить
              </button>
            </>
          }
        >
          <p>
            <strong>Разминка:</strong> {w.plan.warmup}
          </p>
          <WorkoutCoach plan={w.plan} />
          <div className="ex-grid">
            {w.plan.exercises.map((ex, i) => (
              <div className="ex-card" key={i}>
                <div className="ex-anim-wrap">
                  <ExerciseAnimation name={ex.name} />
                </div>
                <div className="ex-card-name">{ex.name}</div>
                <div className="ex-badges">
                  <span className="ex-badge">
                    {ex.sets} × {ex.reps}
                  </span>
                  <span className="ex-badge">отдых {ex.restSeconds}с</span>
                </div>
                <p className="ex-card-desc">{ex.description}</p>
              </div>
            ))}
          </div>
          <p>
            <strong>Заминка:</strong> {w.plan.cooldown}
          </p>
        </Accordion>
      ))}
    </div>
  )
}
