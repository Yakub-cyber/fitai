import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Ключи в localStorage, которые пишет static-режим (см. api/local.ts).
// Пароли (fitai_users → passwordHash) экспортируем как есть — это тот же браузер юзера,
// а без хэша импорт в новом браузере просто не пустил бы обратно.
const EXPORT_KEYS_STATIC = ['fitai_users'] as const
const USER_KEYS_PREFIXES = ['fitai_workouts_', 'fitai_diets_', 'fitai_logs_']

type Dump = { version: 1; exportedAt: string; entries: Record<string, unknown> }

function collectDump(): Dump {
  const entries: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    const isUserData = USER_KEYS_PREFIXES.some((p) => key.startsWith(p))
    const isStatic = EXPORT_KEYS_STATIC.includes(key as (typeof EXPORT_KEYS_STATIC)[number])
    if (!isUserData && !isStatic) continue
    try {
      entries[key] = JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      entries[key] = localStorage.getItem(key)
    }
  }
  return { version: 1, exportedAt: new Date().toISOString(), entries }
}

export function DataExport() {
  const { user } = useAuth()
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const dump = collectDump()
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `fitai-backup-${date}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMsg(`Готово. Скачан fitai-backup-${date}.json`)
    setTimeout(() => setMsg(''), 4000)
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<Dump>
      if (parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== 'object') {
        throw new Error('Файл не похож на бэкап FitAI')
      }
      if (!confirm('Импорт заменит текущие данные в этом браузере. Продолжить?')) return
      // Аккуратная перезапись: чистим только знакомые ключи, чужие LS-данные не трогаем.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (!key) continue
        if (
          EXPORT_KEYS_STATIC.includes(key as (typeof EXPORT_KEYS_STATIC)[number]) ||
          USER_KEYS_PREFIXES.some((p) => key.startsWith(p))
        ) {
          localStorage.removeItem(key)
        }
      }
      for (const [key, value] of Object.entries(parsed.entries)) {
        localStorage.setItem(key, JSON.stringify(value))
      }
      setMsg('Импорт завершён. Перезагружаю…')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Не удалось импортировать файл')
      setTimeout(() => setMsg(''), 5000)
    }
  }

  if (!user) return null

  return (
    <div className="card">
      <h3>Резервная копия</h3>
      <p className="muted">
        В статичной версии данные хранятся только в этом браузере. Скачайте бэкап, чтобы перенести профиль
        на другой браузер или устройство.
      </p>
      <div className="inline-form">
        <button className="btn btn-ghost" onClick={handleExport}>
          ⬇ Скачать бэкап
        </button>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          ⬆ Загрузить бэкап
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImport(f)
            e.target.value = ''
          }}
        />
      </div>
      {msg && <p className="form-hint">{msg}</p>}
    </div>
  )
}
