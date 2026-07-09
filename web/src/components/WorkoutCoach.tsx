import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkoutPlan } from '../api/types'
import { ExerciseAnimation } from './ExerciseAnimation'
import '../voice-coach.css'

// Голосовой тренер: озвучивает разминку, упражнения (подходы/повторы/технику),
// ведёт по тренировке и вслух считает отдых. Web Speech API — офлайн, без ключей.

type Phase = 'idle' | 'intro' | 'exercise' | 'await' | 'rest' | 'outro' | 'done'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function WorkoutCoach({ plan }: { plan: WorkoutPlan }) {
  const exercises = plan.exercises
  const [phase, setPhase] = useState<Phase>('idle')
  const [cursor, setCursor] = useState(0) // индекс текущего упражнения
  const [restLeft, setRestLeft] = useState(0)
  const [paused, setPaused] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef = useRef(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  // Подбираем русский голос (список подгружается асинхронно)
  useEffect(() => {
    if (!supported) return
    const pick = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current =
        voices.find((v) => /ru[-_]?RU/i.test(v.lang)) ??
        voices.find((v) => /^ru/i.test(v.lang)) ??
        null
    }
    pick()
    window.speechSynthesis.addEventListener('voiceschanged', pick)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pick)
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!supported) {
      onEnd?.()
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ru-RU'
    if (voiceRef.current) u.voice = voiceRef.current
    u.rate = 1
    u.pitch = 1
    if (onEnd) u.onend = () => onEnd()
    window.speechSynthesis.speak(u)
  }, [])

  const exerciseText = (i: number): string => {
    const ex = exercises[i]
    const sets = `${ex.sets} ${plural(ex.sets, 'подход', 'подхода', 'подходов')}`
    return `Упражнение ${i + 1} из ${exercises.length}. ${ex.name}. ${sets} по ${ex.reps}. ${ex.description}`
  }

  // Полная остановка и сброс
  const stop = useCallback(() => {
    clearTimer()
    if (supported) window.speechSynthesis.cancel()
    pausedRef.current = false
    setPaused(false)
    setPhase('idle')
    setCursor(0)
    setRestLeft(0)
  }, [])

  // Переход к упражнению i (или к заминке, если упражнения кончились)
  const goExercise = useCallback(
    (i: number) => {
      clearTimer()
      if (i >= exercises.length) {
        setPhase('outro')
        speak(`Заминка. ${plan.cooldown}. Тренировка завершена. Отличная работа!`, () =>
          setPhase('done'),
        )
        return
      }
      setCursor(i)
      setPhase('exercise')
      speak(exerciseText(i), () => setPhase('await'))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercises.length, plan.cooldown, speak],
  )

  const startRest = useCallback(
    (i: number) => {
      const seconds = exercises[i].restSeconds
      if (seconds <= 0) {
        goExercise(i + 1)
        return
      }
      setPhase('rest')
      setRestLeft(seconds)
      speak(`Отдых ${seconds} ${plural(seconds, 'секунда', 'секунды', 'секунд')}.`)
      clearTimer()
      timerRef.current = setInterval(() => {
        if (pausedRef.current) return
        setRestLeft((s) => {
          if (s <= 1) {
            clearTimer()
            speak('Поехали!', () => goExercise(i + 1))
            return 0
          }
          return s - 1
        })
      }, 1000)
    },
    [exercises, goExercise, speak],
  )

  const start = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    pausedRef.current = false
    setPaused(false)
    setPhase('intro')
    setCursor(0)
    speak(`${plan.title}. Разминка. ${plan.warmup}`, () => goExercise(0))
  }, [goExercise, plan.title, plan.warmup, speak])

  // Пользователь выполнил упражнение → к отдыху (или к заминке, если последнее)
  const doneSet = useCallback(() => {
    if (cursor >= exercises.length - 1) goExercise(cursor + 1)
    else startRest(cursor)
  }, [cursor, exercises.length, goExercise, startRest])

  const skip = useCallback(() => {
    clearTimer()
    if (supported) window.speechSynthesis.cancel()
    goExercise(cursor + 1)
  }, [cursor, goExercise])

  const togglePause = useCallback(() => {
    if (!supported) return
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
    if (next) window.speechSynthesis.pause()
    else window.speechSynthesis.resume()
  }, [])

  // Чистка при размонтировании
  useEffect(() => {
    return () => {
      clearTimer()
      if (supported) window.speechSynthesis.cancel()
    }
  }, [])

  if (!supported) {
    return (
      <div className="coach">
        <div className="coach-head">🎙️ Голосовой тренер</div>
        <p className="coach-note">
          Ваш браузер не поддерживает синтез речи. Откройте сайт в Chrome, Edge или Safari.
        </p>
      </div>
    )
  }

  const active = phase !== 'idle' && phase !== 'done'
  const ex = exercises[cursor]
  const total = exercises.length
  const progress =
    phase === 'idle' ? 0 : phase === 'outro' || phase === 'done' ? 100 : (cursor / total) * 100

  return (
    <div className={`coach ${active ? 'is-live' : ''}`}>
      <div className="coach-head">
        <span className="coach-dot" />
        🎙️ Голосовой тренер
      </div>

      <div className="coach-stage">
        <div className="coach-anim">
          <ExerciseAnimation name={phase === 'rest' ? '' : ex?.name ?? 'разминка'} />
        </div>
        <div className="coach-body">
          {phase === 'idle' && (
            <>
              <div className="coach-now">Готовы к тренировке?</div>
              <div className="coach-sub">
                Тренер озвучит каждое упражнение, покажет технику и посчитает отдых.
              </div>
            </>
          )}
          {phase === 'intro' && (
            <>
              <div className="coach-phase">Разминка</div>
              <div className="coach-now">{plan.title}</div>
              <div className="coach-sub">{plan.warmup}</div>
            </>
          )}
          {(phase === 'exercise' || phase === 'await') && ex && (
            <>
              <div className="coach-phase">
                Упражнение {cursor + 1} из {total}
              </div>
              <div className="coach-now">{ex.name}</div>
              <div className="coach-sub">
                {ex.sets} × {ex.reps} · отдых {ex.restSeconds}с
              </div>
            </>
          )}
          {phase === 'rest' && (
            <>
              <div className="coach-phase">Отдых</div>
              <div className="coach-timer">{restLeft}</div>
              <div className="coach-sub">
                Дальше: {exercises[cursor + 1]?.name ?? 'заминка'}
              </div>
            </>
          )}
          {(phase === 'outro' || phase === 'done') && (
            <>
              <div className="coach-phase">Финиш</div>
              <div className="coach-now">Тренировка завершена 🎉</div>
              <div className="coach-sub">{plan.cooldown}</div>
            </>
          )}
        </div>
      </div>

      <div className="coach-progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="coach-controls">
        {phase === 'idle' || phase === 'done' ? (
          <button className="btn btn-primary btn-sm" onClick={start}>
            ▶ Начать тренировку
          </button>
        ) : (
          <>
            {phase === 'await' && (
              <button className="btn btn-success btn-sm" onClick={doneSet}>
                ✓ Сделал — отдых
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={togglePause}>
              {paused ? '▶ Продолжить' : '⏸ Пауза'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={skip}>
              ⏭ Пропустить
            </button>
            <button className="btn btn-danger btn-sm" onClick={stop}>
              ⏹ Стоп
            </button>
          </>
        )}
      </div>
    </div>
  )
}
