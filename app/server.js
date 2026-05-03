const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { execSync } = require('child_process')

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' })
} catch (e) {
  console.error('Migration failed:', e.message)
}

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const PORT = parseInt(process.env.PORT || '3000', 10)

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`> Ready on http://0.0.0.0:${PORT}`)
  })
})
