import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import mongoose from 'mongoose'
import { config } from './config'

// Держим ссылку на модуле, чтобы встроенный mongod не был убран сборщиком мусора
let embedded: import('mongodb-memory-server').MongoMemoryServer | null = null

async function startEmbedded(): Promise<string> {
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const dbPath = resolve(config.embeddedDbPath)
  if (!existsSync(dbPath)) mkdirSync(dbPath, { recursive: true })

  // wiredTiger + собственный dbPath => данные переживают перезапуск
  embedded = await MongoMemoryServer.create({
    instance: { dbName: 'fitai', dbPath, storageEngine: 'wiredTiger' },
  })
  console.log('[server] Встроенная MongoDB запущена (без Docker), данные в', dbPath)
  return embedded.getUri('fitai')
}

export async function connectDb(): Promise<void> {
  const uri = config.embeddedMongo ? await startEmbedded() : config.mongoUri
  await mongoose.connect(uri)
  console.log('[server] MongoDB подключена')
}
