import { randomUUID } from 'node:crypto'
import { extname, resolve } from 'node:path'
import { FastifyInstance } from 'fastify'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'

const pump = promisify(pipeline)

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', async (request, reply) => {
    const upload = await request.file({
      limits: {
        fileSize: 5_242_880, // 5mb
      },
    })

    if (!upload) {
      return reply.status(400).send()
    }

    // verifica se o arquivo e video ou imagem
    const mimeTypeRegex = /^(image|video)\/[a-zA-Z]+/
    const isValidFileFormat = mimeTypeRegex.test(upload.mimetype)

    if (!isValidFileFormat) {
      return reply.status(400).send()
    }
    // p/ cd arquivo ser unico, pois pd ter nomes iguais
    const fileId = randomUUID()

    // captura a extensao do arquivo (ex: png)
    const extension = extname(upload.filename)

    // concatena o nome do arquivo + extensao (ex: arquivo.pn)
    const fileName = fileId.concat(extension)

    // vai salvando o arquivo aos poucos, conforme carrega, como num stream
    const writeStream = createWriteStream(
      // padroniza (arruma) o caminho p/ tds S.Os
      resolve(__dirname, '../../uploads/', fileName),
    )

    await pump(upload.file, writeStream)

    // request.protocol retorna http ou https
    // request.hostname retorna o endereco (localhost ou o site)
    const fullUrl = request.protocol.concat('://').concat(request.hostname)
    // gera uma URL e concatena com o nome do arquivo
    const fileUrl = new URL(`/uploads/${fileName}`, fullUrl).toString()
    return { fileUrl }
  })
}
