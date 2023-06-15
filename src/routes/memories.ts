import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function memoriesRoutes(app: FastifyInstance) {
  /* como todas as rotas precisam da verificacao JWT,
   faz uma verificacao antes de executar qualquer uma (preHandler)
  */
  app.addHook('preHandler', async (request) => {
    /* se nao tiver token valido, nao deixa o codigo seguir.
    Nesse caso tds as funcoes necessitam do token p/ funcionarem */
    await request.jwtVerify()
  })

  app.get('/memories', async (request) => {
    console.log('aaaa', request)
    const memories = await prisma.memory.findMany({
      /* retorna as memorias somente do usuario logado */
      where: {
        userId: request.user.sub,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    return memories.map((memory) => {
      return {
        id: memory.id,
        coverUrl: memory.coverUrl,
        /* retorna somente os 115 primeiros caracteres e coloca um ... no final */
        excerpt: memory.content.substring(0, 115).concat('...'),
        createdAt: memory.createdAt,
      }
    })
  })

  app.get('/memories/:id', async (request, reply) => {
    /* so vai receber o ID (request.params q veio pelo parametro) se ele for 
    uma string do tipo UUID, caso contrario retorna um erro. */
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    /* retorna a memoria com o ID sugerido ou retorna erro */
    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    })

    if (!memory.isPublic && memory.userId !== request.user.sub) {
      // reply: resposta. nesse caso responde com o erro 401
      return reply.status(401).send()
    }

    return memory
  })

  app.post('/memories', async (request) => {
    /* o coerce converte o conteudo de acordo com oq vier
       0, undefined, null, ' ' = false
       1, 'suhausus' = true 
    */
    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    })

    const { content, coverUrl, isPublic } = bodySchema.parse(request.body)

    const memory = await prisma.memory.create({
      data: {
        content,
        coverUrl,
        isPublic,
        userId: request.user.sub,
      },
    })

    return memory
  })

  app.put('/memories/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    })

    const { content, coverUrl, isPublic } = bodySchema.parse(request.body)

    // verifica se o usuario q ta tentando alterar e o msm q criou a memoria
    let memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    })

    if (memory.userId !== request.user.sub) {
      return reply.status(401).send()
    }

    memory = await prisma.memory.update({
      where: {
        id,
      },
      data: {
        content,
        coverUrl,
        isPublic,
      },
    })
    return memory
  })

  app.delete('/memories/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)
    /* retorna a memoria com o ID sugerido ou retorna erro */

    // verifica se o usuario e o criador daquela memoria
    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      },
    })

    if (memory.userId !== request.user.sub) {
      return reply.status(401).send()
    }

    await prisma.memory.delete({
      where: {
        id,
      },
    })
  })
}
