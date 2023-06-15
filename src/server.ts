import 'dotenv/config'
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { memoriesRoutes } from './routes/memories'
import { authRoutes } from './routes/auth'
import { uploadRoutes } from './routes/upload'
import { resolve } from 'node:path'

const app = fastify()

app.register(multipart)

app.register(require('@fastify/static'), {
  // root indica qual pasta sera publica
  root: resolve(__dirname, '../uploads'),
  // qual parte da URL
  prefix: '/uploads',
})

app.register(cors, {
  // todas as urls de frontend podem acessar esse projeto
  origin: true,
})

app.register(jwt, {
  /* como se fosse o padrao pra criptografar. Wt mais complexo a secret, melhor */
  secret: 'spacetime',
})

app.register(authRoutes)
app.register(uploadRoutes)
app.register(memoriesRoutes)

app
  .listen({
    port: 3333,
    host: '0.0.0.0', // precisar pra funcionar no expo
  })
  .then(() => {
    console.log('🚀 Server is running! ')
  })
