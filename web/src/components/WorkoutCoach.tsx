import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WorkoutPlan } from '../api/types'
import { ExerciseAnimation } from './ExerciseAnimation'
import '../voice-coach.css'

// Голосовой тренер: озвучивает разминку, упражнения (подходы/повторы/технику),
// ведёт по тренировке и вслух считает отдых. Web Speech API — офлайн, без ключей.

type Phase = 'idle' | 'intro' | 'exercise' | 'await' | 'rest' | 'outro' | 'done'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
const SETTINGS_KEY = 'fitai_coach_voice'

// Ранжирование русских голосов. Чем выше индекс регэкспа — тем приятнее (по опыту).
// Google / Yandex / Neural / Enhanced — почти всегда качественнее, чем базовые SAPI.
const VOICE_QUALITY: RegExp[] = [
  /google/i,
  /yandex/i,
  /neural|natural|enhanced|premium/i,
  /milena/i, // macOS/iOS женский
  /katya|ekaterina|irina|marina|alena|dariya/i, // женские Microsoft
  /pavel|yuri|maxim|dmitri/i, // мужские Microsoft/macOS
  /microsoft/i,
]

function ruVoices(): SpeechSynthesisVoice[] {
  if (!supported) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => /^ru/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a))
}

function voiceScore(v: SpeechSynthesisVoice): number {
  for (let i = 0; i < VOICE_QUALITY.length; i++) {
    if (VOICE_QUALITY[i].test(v.name)) return VOICE_QUALITY.length - i
  }
  return 0
}

interface Settings {
  voiceName: string | null
  rate: number
  pitch: number
}

const DEFAULT_SETTINGS: Settings = { voiceName: null, rate: 0.95, pitch: 1.05 }

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

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
  const [cursor, setCursor] = useState(0)
  const [restLeft, setRestLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [settings, setSettings] = useState<Settings>(() => (supported ? loadSettings() : DEFAULT_SETTINGS))

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  // Подгружаем список русских голосов (loadVoices у некоторых браузеров асинхронный).
  useEffect(() => {
    if (!supported) return
    const refresh = () => setVoices(ruVoices())
    refresh()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [])

  // Автовыбор лучшего голоса, если пользователь ещё не выбирал.
  useEffect(() => {
    if (!supported || settings.voiceName || voices.length === 0) return
    const best = voices[0]
    setSettings((s) => ({ ...s, voiceName: best.name }))
  }, [voices, settings.voiceName])

  const currentVoice = useMemo(
    () => voices.find((v) => v.name === settings.voiceName) ?? voices[0] ?? null,
    [voices, settings.voiceName],
  )

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!supported) {
        onEnd?.()
        return
      }
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ru-RU'
      if (currentVoice) u.voice = currentVoice
      u.rate = settings.rate
      u.pitch = settings.pitch
      if (onEnd) u.onend = () => onEnd()
      window.speechSynthesis.speak(u)
    },
    [currentVoice, settings.rate, settings.pitch],
  )

  const previewVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance('Привет! Я твой тренер. Начнём тренировку — сделай десять приседаний.')
      u.lang = 'ru-RU'
      u.voice = voice
      u.rate = settings.rate
      u.pitch = settings.pitch
      window.speechSynthesis.speak(u)
    },
    [settings.rate, settings.pitch],
  )

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      saveSettings(next)
      return next
    })
  }

  const exerciseText = (i: number): string => {
    const ex = exercises[i]
    const sets = `${ex.sets} ${plural(ex.sets, 'подход', 'подхода', 'подходов')}`
    return `Упражнение ${i + 1} из ${exercises.length}. ${ex.name}. ${sets} по ${ex.reps}. ${ex.description}`
  }

  const stop = useCallback(() => {
    clearTimer()
    if (supported) window.speechSynthesis.cancel()
    pausedRef.current = false
    setPaused(false)
    setPhase('idle')
    setCursor(0)
    setRestLeft(0)
  }, [])

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
        <button
          className="coach-settings-btn"
          onClick={() => setShowSettings((v) => !v)}
          title="Настройки голоса"
          type="button"
        >
          ⚙
        </button>
      </div>

      {showSettings && (
        <div className="coach-settings">
          <label>
            <span>Голос {voices.length === 0 && '(загружается…)'}</span>
            <select
              value={settings.voiceName ?? ''}
              onChange={(e) => updateSettings({ voiceName: e.target.value })}
            >
              {voices.length === 0 && <option value="">— системный —</option>}
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} {v.localService ? '' : '· облако'}
                </option>
              ))}
            </select>
          </label>
          <div className="coach-sliders">
            <label>
              <span>Темп: {settings.rate.toFixed(2)}×</span>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={settings.rate}
                onChange={(e) => updateSettings({ rate: Number(e.target.value) })}
              />
            </label>
            <label>
              <span>Тональность: {settings.pitch.toFixed(2)}</span>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.05"
                value={settings.pitch}
                onChange={(e) => updateSettings({ pitch: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="coach-settings-actions">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={!currentVoice}
              onClick={() => currentVoice && previewVoice(currentVoice)}
            >
              🔊 Прослушать
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                saveSettings(DEFAULT_SETTINGS)
                setSettings({ ...DEFAULT_SETTINGS, voiceName: voices[0]?.name ?? null })
              }}
            >
              Сбросить
            </button>
          </div>
          {voices.length === 0 && (
            <p className="coach-note">
              В системе не найден русский голос. На Windows: Параметры → Время и язык → Речь → добавить русский. На Android — Google Speech Services.
            </p>
          )}
        </div>
      )}

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
