// Легковесное хранение JWT-токенов в файле — по одному на telegramId.
// Живёт рядом с процессом, не в БД (у сервера своя Mongo, а боту нужен только
// быстрый доступ к JWT конкретного пользователя, чтобы ходить в API от его имени).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const FILE = resolve(here, '../data/tokens.json')

type Store = Record<string, string> // telegramId -> jwt

function read(): Store {
  if (!existsSync(FILE)) return {}
  try {
    return JSON.parse(readFileSync(FILE, 'utf8')) as Store
  } catch {
    return {}
  }
}

function write(store: Store): void {
  mkdirSync(dirname(FILE), { recursive: true })
  writeFileSync(FILE, JSON.stringify(store, null, 2), 'utf8')
}

export function getToken(telegramId: number): string | null {
  return read()[String(telegramId)] ?? null
}

export function setToken(telegramId: number, token: string): void {
  const s = read()
  s[String(telegramId)] = token
  write(s)
}

export function clearToken(telegramId: number): void {
  const s = read()
  delete s[String(telegramId)]
  write(s)
}
