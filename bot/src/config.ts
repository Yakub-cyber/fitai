import 'dotenv/config'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Env ${name} обязателен (см. bot/.env.example)`)
  return v
}

export const config = {
  botToken: required('BOT_TOKEN'),
  botSharedSecret: required('BOT_SHARED_SECRET'),
  apiUrl: (process.env.API_URL ?? 'http://localhost:5000').replace(/\/$/, ''),
  webUrl: process.env.WEB_URL ?? 'https://yakub-cyber.github.io/fitai/',
  tmaUrl: process.env.TMA_URL ?? '',
}
