import { buildServer } from './server'
import { connectDb, disconnectDb } from './lib/prismaClient'
import { config } from './config'

async function main() {
  const app = await buildServer()

  try {
    await connectDb()
    app.log.info('✓ Database connected')
  } catch (err) {
    app.log.warn('⚠  Database not available — running without DB (dev mode)')
    app.log.warn(err)
  }

  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`✓ RC API running on port ${config.port}`)

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received — shutting down`)
    await app.close()
    await disconnectDb()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

main().catch(err => {
  console.error('Fatal error during startup:', err)
  process.exit(1)
})
