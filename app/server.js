const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { runMigrations } = require('./migrate')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const PORT = parseInt(process.env.PORT || '3000', 10)

runMigrations()
  .then(() => app.prepare())
  .then(() => {
    createServer((req, res) => {
      handle(req, res, parse(req.url, true))
    }).listen(PORT, '0.0.0.0', () => {
      console.log(`> Ready on http://0.0.0.0:${PORT}`)
    })
  })
  .catch(err => {
    console.error('Startup failed:', err)
    process.exit(1)
  })
