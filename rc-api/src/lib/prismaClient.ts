import { PrismaClient } from '../../generated/prisma'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

export async function connectDb(): Promise<void> {
  await prisma.$connect()
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect()
}
