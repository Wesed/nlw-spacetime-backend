import '@fastify/jwt'

// cria um modelo d de dados que o token retorna
declare module '@fastify/jwt' {
  export interface FastifyJWT {
    user: {
      sub: string

      name: string

      avatarUrl: string
    }
  }
}
