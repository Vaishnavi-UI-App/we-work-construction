import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { generateToken } from '../utils/auth'
import { buildUserPayload } from '../utils/access'
import { sendMail } from '../utils/mailer'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export default function(prisma: PrismaClient){
  const router = Router()

  router.post('/register', async (req, res) => {
    const { email, password, name, role } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'User exists' })
    const hash = await bcrypt.hash(password, 10)
    // Self-registration never grants ADMIN or a role's permissions — an admin must assign a role afterwards.
    const user = await prisma.user.create({ data: { email, password: hash, name, role: 'No Role' } })
    const token = generateToken({ id: user.id, email: user.email, role: user.role })
    res.json({ token, user: await buildUserPayload(prisma, user.id) })
  })

  router.post('/login', async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' })
    const token = generateToken({ id: user.id, email: user.email, role: user.role })
    res.json({ token, user: await buildUserPayload(prisma, user.id) })
  })

  // Request a reset link — always responds the same way whether or not the
  // email exists, so this endpoint can't be used to enumerate registered accounts.
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    const generic = { message: 'If an account exists for that email, a reset link has been sent.' }

    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (user && user.isActive) {
        const token = crypto.randomBytes(32).toString('hex')
        await prisma.passwordResetToken.create({
          data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
        })
        const link = `${FRONTEND_URL}/?resetToken=${token}`
        await sendMail(
          user.email,
          'Reset your We Work Constructions password',
          `<p>Hi ${user.name || ''},</p>
           <p>Click the link below to reset your password. This link expires in 1 hour.</p>
           <p><a href="${link}">${link}</a></p>
           <p>If you didn't request this, you can safely ignore this email.</p>`
        )
      }
      res.json(generic)
    } catch (err) {
      console.error(err)
      res.json(generic) // still don't leak whether the email exists
    }
  })

  // Complete a reset using the token from the emailed link
  router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' })
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    try {
      const record = await prisma.passwordResetToken.findUnique({ where: { token } })
      if (!record || record.usedAt || record.expiresAt < new Date()) {
        return res.status(400).json({ error: 'This reset link is invalid or has expired' })
      }
      const hash = await bcrypt.hash(password, 10)
      await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
        prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      ])
      res.json({ ok: true })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Failed to reset password' })
    }
  })

  return router
}
