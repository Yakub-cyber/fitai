import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WorkoutPlan } from '../api/types'
import { ExerciseAnimation } from './ExerciseAnimation'
import '../voice-coach.css'

// Тренер без голоса: плавно появляющиеся подсказки (fade-in ≤3 строк, автоскрытие),
// красивый круговой таймер отдыха и звуковые эффекты через Web Audio API — никаких ассетов.

type Phase = 'idle' | 'intro' | 'exercise' | 'await' | 'rest' | 'outro' | 'done'

const SOUND_KEY = 'fitai_coach_sound'

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

// ────────── Мини-синтезатор звука на Web Audio API ──────────
function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = () => {
    if (!enabled) return null
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctxRef.current = new Ctor()
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  const beep = useCallback(
    (freq = 660, durationMs = 120, gain = 0.18, type: OscillatorType = 'sine') => {
      const ctx = getCtx()
      if (!ctx) return
      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000)
      osc.connect(g).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + durationMs / 1000 + 0.02)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled],
  )

  // Восходящая триоль — «поехали!»
  const chordGo = useCallback(() => {
    beep(523, 90, 0.16) // C
    setTimeout(() => beep(659, 90, 0.16), 100) // E
    setTimeout(() => beep(784, 180, 0.18), 200) // G
  }, [beep])

  // Мягкое «дзын» — упражнение выполнено
  const chime = useCallback(() => {
    beep(880, 200, 0.14, 'triangle')
    setTimeout(() => beep(1174, 260, 0.11, 'triangle'), 80)
  }, [beep])

  // Отсчёт 3-2-1: короткие тики средней высоты
  const tick = useCallback(() => beep(880, 80, 0.12, 'square'), [beep])

  return { beep, chordGo, chime, tick, unlock: getCtx }
}

// ────────── Разбивка сообщения на ≤3 строки ──────────
function pack3(...parts: string[]): string[] {
  return parts.filter(Boolean).slice(0, 3)
}

interface MessageState {
  id: number
  lines: string[]
  ttl: number // ms
}

export function WorkoutCoach({ plan }: { plan: WorkoutPlan }) {
  const exercises = plan.exercises
  const [phase, setPhase] = useState<Phase>('idle')
  const [cursor, setCursor] = useState(0)
  const [restLeft, setRestLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const [msg, setMsg] = useState<MessageState | null>(null)
  const [visible, setVisible] = useState(false)
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      return (localStorage.getItem(SOUND_KEY) ?? '1') !== '0'
    } catch {
      return true
    }
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pausedRef = useRef(false)
  const restStartRef = useRef(0) // ms, для прогресс-кольца

  const sound = useSound(soundOn)

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [soundOn])

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }
  const clearMsgTimers = () => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
    if (msgHideRef.current) clearTimeout(msgHideRef.current)
    msgTimerRef.current = null
    msgHideRef.current = null
  }

  // Показать плавно текст, скрыть через ttl, затем вызвать onEnd.
  const showMessage = useCallback((lines: string[], ttlMs: number, onEnd?: () => void) => {
    clearMsgTimers()
    const id = Date.now()
    setMsg({ id, lines: lines.slice(0, 3), ttl: ttlMs })
    setVisible(true)
    // fade-out за 350ms до конца
    msgHideRef.current = setTimeout(() => setVisible(false), Math.max(0, ttlMs - 350))
    msgTimerRef.current = setTimeout(() => {
      setMsg(null)
      onEnd?.()
    }, ttlMs)
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    clearMsgTimers()
    pausedRef.current = false
    setPaused(false)
    setPhase('idle')
    setCursor(0)
    setRestLeft(0)
    setMsg(null)
    setVisible(false)
  }, [])

  const goExercise = useCallback(
    (i: number) => {
      clearTimer()
      if (i >= exercises.length) {
        setPhase('outro')
        sound.chime()
        showMessage(pack3('Тренировка завершена 🎉', plan.cooldown), 4200, () => setPhase('done'))
        return
      }
      setCursor(i)
      setPhase('exercise')
      const ex = exercises[i]
      sound.beep(660, 120, 0.14)
      const setsStr = `${ex.sets} × ${ex.reps}`
      showMessage(
        pack3(`${i + 1}/${exercises.length} · ${ex.name}`, setsStr, ex.description),
        6000,
        () => setPhase('await'),
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercises.length, plan.cooldown, showMessage, sound],
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
      restStartRef.current = seconds
      sound.chime()
      showMessage(
        pack3('Отдых', `Дальше: ${exercises[i + 1]?.name ?? 'заминка'}`),
        Math.min(2200, seconds * 400),
      )
      clearTimer()
      timerRef.current = setInterval(() => {
        if (pausedRef.current) return
        setRestLeft((s) => {
          const next = s - 1
          if (next === 3 || next === 2 || next === 1) sound.tick()
          if (next <= 0) {
            clearTimer()
            sound.chordGo()
            showMessage(pack3('Поехали!'), 1200, () => goExercise(i + 1))
            return 0
          }
          return next
        })
      }, 1000)
    },
    [exercises, goExercise, showMessage, sound],
  )

  const start = useCallback(() => {
    sound.unlock() // разблокировать AudioContext по пользовательскому жесту
    clearTimer()
    clearMsgTimers()
    pausedRef.current = false
    setPaused(false)
    setPhase('intro')
    setCursor(0)
    sound.chordGo()
    showMessage(pack3(plan.title, 'Разминка', plan.warmup), 5000, () => goExercise(0))
  }, [goExercise, plan.title, plan.warmup, showMessage, sound])

  const doneSet = useCallback(() => {
    sound.chime()
    if (cursor >= exercises.length - 1) goExercise(cursor + 1)
    else startRest(cursor)
  }, [cursor, exercises.length, goExercise, sound, startRest])

  const skip = useCallback(() => {
    clearTimer()
    clearMsgTimers()
    goExercise(cursor + 1)
  }, [cursor, goExercise])

  const togglePause = useCallback(() => {
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      clearMsgTimers()
    }
  }, [])

  const active = phase !== 'idle' && phase !== 'done'
  const ex = exercises[cursor]
  const total = exercises.length
  const progress =
    phase === 'idle' ? 0 : phase === 'outro' || phase === 'done' ? 100 : (cursor / total) * 100

  // Progress-ring отдыха: окружность
  const ringR = 46
  const ringC = 2 * Math.PI * ringR
  const restFrac =
    phase === 'rest' && restStartRef.current > 0 ? restLeft / restStartRef.current : 0
  const ringOffset = useMemo(() => ringC * (1 - restFrac), [ringC, restFrac])

  return (
    <div className={`coach ${active ? 'is-live' : ''}`}>
      <div className="coach-head">
        <span className="coach-dot" />
        <span>Тренер</span>
        <button
          className="coach-settings-btn"
          onClick={() => setSoundOn((v) => !v)}
          title={soundOn ? 'Выключить звук' : 'Включить звук'}
          type="button"
        >
          {soundOn ? '🔔' : '🔕'}
        </button>
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
                Тренер плавно покажет каждое упражнение и отсчитает отдых. Со звуковыми
                подсказками, без голоса.
              </div>
            </>
          )}

          {phase === 'rest' && (
            <div className="coach-timer-wrap">
              <svg className="coach-ring" viewBox="0 0 120 120" aria-hidden="true">
                <defs>
                  <linearGradient id="coach-ring-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="var(--accent)" />
                    <stop offset="0.5" stopColor="var(--accent-3)" />
                    <stop offset="1" stopColor="var(--accent-2)" />
                  </linearGradient>
                </defs>
                <circle className="coach-ring-bg" cx="60" cy="60" r={ringR} />
                <circle
                  className="coach-ring-fg"
                  cx="60"
                  cy="60"
                  r={ringR}
                  stroke="url(#coach-ring-grad)"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                />
              </svg>
              <div className="coach-timer-num">{restLeft}</div>
              <div className="coach-timer-cap">
                отдых · дальше {exercises[cursor + 1]?.name ?? 'заминка'}
              </div>
            </div>
          )}

          {phase !== 'idle' && phase !== 'rest' && (
            <div className={`coach-msg ${visible ? 'is-in' : 'is-out'}`}>
              {msg?.lines.map((line, i) => (
                <div key={`${msg.id}-${i}`} className={`coach-msg-line coach-msg-line--${i}`}>
                  {line}
                </div>
              ))}
              {!msg && ex && phase === 'await' && (
                <>
                  <div className="coach-msg-line coach-msg-line--0">
                    {cursor + 1}/{total} · {ex.name}
                  </div>
                  <div className="coach-msg-line coach-msg-line--1">
                    {ex.sets} × {ex.reps}
                  </div>
                </>
              )}
            </div>
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
