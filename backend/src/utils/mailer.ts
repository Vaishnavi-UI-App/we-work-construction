import nodemailer from 'nodemailer'

// Reads Gmail SMTP credentials from env. Set EMAIL_USER (the Gmail address to
// send from) and EMAIL_PASS (a 16-char Google "App Password", not the normal
// account password) in .env. If unset, emails are logged instead of sent so
// local dev doesn't crash — the reset link still prints to the console.
const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS

const transporter = EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS } })
  : null

// Returns whether the mail was actually handed to an SMTP transporter — callers
// that need a fallback when email isn't configured (e.g. surfacing a password
// reset link directly in the API response) branch on this.
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    console.warn('[mailer] EMAIL_USER/EMAIL_PASS not set — email not sent. Would have sent:')
    console.warn(`  To: ${to}\n  Subject: ${subject}\n  ${html.replace(/<[^>]+>/g, ' ')}`)
    return false
  }
  await transporter.sendMail({ from: `"We Work Constructions" <${EMAIL_USER}>`, to, subject, html })
  return true
}
