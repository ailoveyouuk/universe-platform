import { prisma } from './prismaClient'

// Short, human-shareable codes for cohort invite links — e.g. "RC-TX7K2M".
// Alphabet excludes visually-ambiguous characters (0/O, 1/I/L) since these
// get read aloud, typed in manually, or copy-pasted from a slide.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const MAX_ATTEMPTS = 10

function randomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `RC-${code}`
}

// Generates a code guaranteed unique against the live cohorts table at the
// moment of creation. A collision is astronomically unlikely at this scale
// (32^6 ≈ 1 billion combinations) but checked anyway rather than trusted.
export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode()
    const existing = await prisma.cohort.findUnique({ where: { inviteCode: code }, select: { id: true } })
    if (!existing) return code
  }
  throw new Error('Could not generate a unique invite code after multiple attempts')
}
