const Fastify = require('fastify')

const fastify = Fastify({ logger: true })

// Register a route
fastify.get('/api/hello', async (request, reply) => {
  return { message: 'Hello World' }
})

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
