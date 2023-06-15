import { FastifyInstance } from 'fastify'
import axios from 'axios'
// o zod verifica se um elemento e de um tipo especificado, caso contrario retorna erro
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { request } from 'node:http'

export async function authRoutes(app: FastifyInstance) {
  /* pega o request.body, verifica se e uma string (nao e null)
   se for, retorna no const 'code', se nao, retorna um erro
   evita q retorne um 'undefined' e quebre toda a aplicacao
  */
  console.log('aaaa', request)
  app.post('/register', async (request) => {
    const bodySchema = z.object({
      code: z.string(),
    })

    const { code } = bodySchema.parse(request.body)

    console.log('bbb', code)

    /* 
      o axios faz uma chamada na api do github e envia os parametros necessarios
      p/ completar a requisicao
    */
    const accessTokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      null,
      {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        // se os codigos forem validos, retorna o ACCESSTOKEN em forma de JSON
        headers: {
          Accept: 'application/json',
        },
      },
    )

    // acessToken = id TEMPORARIO do usuario no github
    const { access_token } = accessTokenResponse.data

    // envia o accessToken pro github pra ter acesso as info do usuario
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    // msm sabendo quais dados virao, e uma boa pratica valida-los pra nao ter divergencias
    console.log(userResponse.data)
    const userSchema = z.object({
      id: z.number(),
      login: z.string(),
      name: z.string(),
      avatar_url: z.string().url(),
    })
    // contem tds as info daquele usuario
    const userInfo = userSchema.parse(userResponse.data)

    // verifica se o usuario ja esta cadastrado
    let user = await prisma.user.findUnique({
      where: {
        githubId: userInfo.id,
      },
    })
    // se nao existir, armazena no banco
    if (!user) {
      user = await prisma.user.create({
        data: {
          githubId: userInfo.id,
          login: userInfo.login,
          name: userInfo.name,
          avatarUrl: userInfo.avatar_url,
        },
      })
    }

    /* 
      como o token n e criptografado, qualquer um tem acesso aos dados contidos nele
      portanto nao deve passar dados sensiveis, como senhas
      (os dados do usuario ficam salvos dentro do token)
    */
    const token = app.jwt.sign(
      {
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      {
        sub: user.id,
        // durante 30 dias, o usuario nao precisa fazer login de novo
        expiresIn: '30 days',
      },
    )

    return {
      token,
    }
  })
}
