import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WorkoutPlan } from '../api/types'
import { ExerciseAnimation } from './ExerciseAnimation'
import '../voice-coach.css'

// Тренер: голос + плавные fade-in подсказки (≤3 строки, автоскрытие) +
// круговой SVG-таймер отдыха + звуковые эффекты (Web Audio API, без ассетов).
// Всё работает офлайн, голос — Web Speech API (использует системные голоса ОС).

type Phase = 'idle' | 'intro' | 'exercise' | 'await' | 'rest' | 'outro' | 'done'

const SOUND_KEY = 'fitai_coach_sound' // общий тумблер: и голос, и бипы
const VOICE_KEY = 'fitai_coach_voice' // настройки голоса

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

// ────────── Ранжирование русских голосов ──────────
const VOICE_QUALITY: RegExp[] = [
  /google/i,
  /yandex/i,
  /neural|natural|enhanced|premium/i,
  /milena/i,
  /katya|ekaterina|irina|marina|alena|dariya/i,
  /pavel|yuri|maxim|dmitri/i,
  /microsoft/i,
]
function voiceScore(v: SpeechSynthesisVoice): number {
  for (let i = 0; i < VOICE_QUALITY.length; i++) {
    if (VOICE_QUALITY[i].test(v.name)) return VOICE_QUALITY.length - i
  }
  return 0
}
function ruVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => /^ru/i.test(v.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a))
}

interface VoiceSettings {
  enabled: boolean
  voiceName: string | null
  rate: number
  pitch: number
}
const DEFAULT_VOICE: VoiceSettings = { enabled: true, voiceName: null, rate: 0.95, pitch: 1.05 }
function loadVoice(): VoiceSettings {
  try {
    const raw = localStorage.getItem(VOICE_KEY)
    if (!raw) return DEFAULT_VOICE
    return { ...DEFAULT_VOICE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_VOICE
  }
}
function saveVoice(s: VoiceSettings): void {
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(s))
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

// ────────── Web Audio: бипы и аккорды ──────────
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
    (freq = 660, durationMs = 120, gain = 0.16, type: OscillatorType = 'sine') => {
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
  const chordGo = useCallback(() => {
    beep(523, 90, 0.14)
    setTimeout(() => beep(659, 90, 0.14), 100)
    setTimeout(() => beep(784, 180, 0.16), 200)
  }, [beep])
  const chime = useCallback(() => {
    beep(880, 200, 0.12, 'triangle')
    setTimeout(() => beep(1174, 260, 0.09, 'triangle'), 80)
  }, [beep])
  const tick = useCallback(() => beep(880, 80, 0.1, 'square'), [beep])

  return { beep, chordGo, chime, tick, unlock: getCtx }
}

function pack3(...parts: string[]): string[] {
  return parts.filter(Boolean).slice(0, 3)
}

interface MessageState {
  id: number
  lines: string[]
  ttl: number
}

export function WorkoutCoach({ plan }: { plan: WorkoutPlan }) {
  const exercises = plan.exercises
  const [phase, setPhase] = useState<Phase>('idle')
  const [cursor, setCursor] = useState(0)
  const [restLeft, setRestLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const [msg, setMsg] = useState<MessageState | null>(null)
  const [visible, setVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voice, setVoice] = useState<VoiceSettings>(() => (speechSupported ? loadVoice() : DEFAULT_VOICE))
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
  const restStartRef = useRef(0)

  const sound = useSound(soundOn)

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [soundOn])

  // Русские голоса — подгружаются асинхронно.
  useEffect(() => {
    if (!speechSupported) return
    const refresh = () => setVoices(ruVoices())
    refresh()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [])

  // Автовыбор лучшего голоса при первом появлении списка.
  useEffect(() => {
    if (!speechSupported || voice.voiceName || voices.length === 0) return
    const next = { ...voice, voiceName: voices[0].name }
    setVoice(next)
    saveVoice(next)
  }, [voices, voice])

  const currentVoice = useMemo(
    () => voices.find((v) => v.name === voice.voiceName) ?? voices[0] ?? null,
    [voices, voice.voiceName],
  )

  const speak = useCallback(
    (text: string) => {
      if (!speechSupported || !soundOn || !voice.enabled || !text.trim()) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ru-RU'
      if (currentVoice) u.voice = currentVoice
      u.rate = voice.rate
      u.pitch = voice.pitch
      window.speechSynthesis.speak(u)
    },
    [currentVoice, soundOn, voice.enabled, voice.rate, voice.pitch],
  )

  const stopSpeak = useCallback(() => {
    if (speechSupported) window.speechSynthesis.cancel()
  }, [])

  const updateVoice = (patch: Partial<VoiceSettings>) => {
    setVoice((v) => {
      const next = { ...v, ...patch }
      saveVoice(next)
      return next
    })
  }

  const previewVoice = useCallback(() => {
    if (!currentVoice) return
    stopSpeak()
    const u = new SpeechSynthesisUtterance('Привет! Я твой тренер. Начнём тренировку — сделай десять приседаний.')
    u.lang = 'ru-RU'
    u.voice = currentVoice
    u.rate = voice.rate
    u.pitch = voice.pitch
    window.speechSynthesis.speak(u)
  }, [currentVoice, stopSpeak, voice.rate, voice.pitch])

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

  // Показать текст + (опционально) озвучить, затем скрыть, затем вызвать onEnd.
  const showMessage = useCallback(
    (lines: string[], ttlMs: number, speakText?: string, onEnd?: () => void) => {
      clearMsgTimers()
      const id = Date.now()
      setMsg({ id, lines: lines.slice(0, 3), ttl: ttlMs })
      setVisible(true)
      if (speakText) speak(speakText)
      msgHideRef.current = setTimeout(() => setVisible(false), Math.max(0, ttlMs - 350))
      msgTimerRef.current = setTimeout(() => {
        setMsg(null)
        onEnd?.()
      }, ttlMs)
    },
    [speak],
  )

  const stop = useCallback(() => {
    clearTimer()
    clearMsgTimers()
    stopSpeak()
    pausedRef.current = false
    setPaused(false)
    setPhase('idle')
    setCursor(0)
    setRestLeft(0)
    setMsg(null)
    setVisible(false)
  }, [stopSpeak])

  const goExercise = useCallback(
    (i: number) => {
      clearTimer()
      if (i >= exercises.length) {
        setPhase('outro')
        sound.chime()
        showMessage(
          pack3('Тренировка завершена 🎉', plan.cooldown),
          4500,
          `Заминка. ${plan.cooldown}. Тренировка завершена. Отличная работа!`,
          () => setPhase('done'),
        )
        return
      }
      setCursor(i)
      setPhase('exercise')
      sound.beep(660, 120, 0.14)
      const ex = exercises[i]
      const setsStr = `${ex.sets} × ${ex.reps}`
      const setsSpoken = `${ex.sets} ${plural(ex.sets, 'подход', 'подхода', 'подходов')} по ${ex.reps}`
      showMessage(
        pack3(`${i + 1}/${exercises.length} · ${ex.name}`, setsStr, ex.description),
        7000,
        `Упражнение ${i + 1} из ${exercises.length}. ${ex.name}. ${setsSpoken}. ${ex.description}`,
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
      const nextName = exercises[i + 1]?.name ?? 'заминка'
      showMessage(
        pack3('Отдых', `Дальше: ${nextName}`),
        Math.min(2400, seconds * 400),
        `Отдых ${seconds} ${plural(seconds, 'секунда', 'секунды', 'секунд')}.`,
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
            showMessage(pack3('Поехали!'), 1400, 'Поехали!', () => goExercise(i + 1))
            return 0
          }
          return next
        })
      }, 1000)
    },
    [exercises, goExercise, showMessage, sound],
  )

  const start = useCallback(() => {
    sound.unlock()
    clearTimer()
    clearMsgTimers()
    stopSpeak()
    pausedRef.current = false
    setPaused(false)
    setPhase('intro')
    setCursor(0)
    sound.chordGo()
    showMessage(
      pack3(plan.title, 'Разминка', plan.warmup),
      5500,
      `${plan.title}. Разминка. ${plan.warmup}`,
      () => goExercise(0),
    )
  }, [goExercise, plan.title, plan.warmup, showMessage, sound, stopSpeak])

  const doneSet = useCallback(() => {
    sound.chime()
    if (cursor >= exercises.length - 1) goExercise(cursor + 1)
    else startRest(cursor)
  }, [cursor, exercises.length, goExercise, sound, startRest])

  const skip = useCallback(() => {
    clearTimer()
    clearMsgTimers()
    stopSpeak()
    goExercise(cursor + 1)
  }, [cursor, goExercise, stopSpeak])

  const togglePause = useCallback(() => {
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
    if (speechSupported) {
      if (next) window.speechSynthesis.pause()
      else window.speechSynthesis.resume()
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      clearMsgTimers()
      stopSpeak()
    }
  }, [stopSpeak])

  const active = phase !== 'idle' && phase !== 'done'
  const ex = exercises[cursor]
  const total = exercises.length
  const progress =
    phase === 'idle' ? 0 : phase === 'outro' || phase === 'done' ? 100 : (cursor / total) * 100

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
          title={soundOn ? 'Выключить звук и голос' : 'Включить звук и голос'}
          type="button"
        >
          {soundOn ? '🔔' : '🔕'}
        </button>
        {speechSupported && (
          <button
            className="coach-settings-btn"
            onClick={() => setShowSettings((v) => !v)}
            title="Настройки голоса"
            type="button"
          >
            ⚙
          </button>
        )}
      </div>

      {showSettings && speechSupported && (
        <div className="coach-settings">
          <label className="coach-toggle">
            <input
              type="checkbox"
              checked={voice.enabled}
              onChange={(e) => updateVoice({ enabled: e.target.checked })}
            />
            <span>Голосовое сопровождение</span>
          </label>
          <label>
            <span>Голос {voices.length === 0 && '(загружается…)'}</span>
            <select
              value={voice.voiceName ?? ''}
              onChange={(e) => updateVoice({ voiceName: e.target.value })}
              disabled={!voice.enabled}
            >
              {voices.length === 0 && <option value="">— системный —</option>}
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                  {v.localService ? '' : ' · облако'}
                </option>
              ))}
            </select>
          </label>
          <div className="coach-sliders">
            <label>
              <span>Темп: {voice.rate.toFixed(2)}×</span>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={voice.rate}
                onChange={(e) => updateVoice({ rate: Number(e.target.value) })}
                disabled={!voice.enabled}
              />
            </label>
            <label>
              <span>Тональность: {voice.pitch.toFixed(2)}</span>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.05"
                value={voice.pitch}
                onChange={(e) => updateVoice({ pitch: Number(e.target.value) })}
                disabled={!voice.enabled}
              />
            </label>
          </div>
          <div className="coach-settings-actions">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={!currentVoice || !voice.enabled}
              onClick={previewVoice}
            >
              🔊 Прослушать
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                const next = { ...DEFAULT_VOICE, voiceName: voices[0]?.name ?? null }
                saveVoice(next)
                setVoice(next)
              }}
            >
              Сбросить
            </button>
          </div>
          {voices.length === 0 && (
            <p className="coach-note">
              В системе нет русского голоса. Windows: Параметры → Время и язык → Речь → добавить.
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
                Тренер озвучит каждое упражнение, плавно покажет подсказку и посчитает отдых.
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
