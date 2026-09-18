import express from 'express'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import request from 'supertest'

describe('GET /paciente/:id', () => {
  let app
  let AppDataSource
  let Paciente
  let pacienteAlvo
  let tokenOutroPaciente

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite'
    process.env.DB_DATABASE = 'test'
    process.env.DB_PASSWORD = 'test'
    process.env.SECRET_KEY_CRYPTO = 'test'
    process.env.SECRET_JWT = fs.readFileSync('src/ssl_certificate/certificado.pem', 'utf8')

    fs.mkdirSync('src/database', { recursive: true })

    const dataSourceModule = await import('../../data-source.js')
    const pacienteEntityModule = await import('../../pacientes/pacienteEntity.js')
    const pacienteControllerModule = await import('../../pacientes/pacienteController.js')
    const pacienteMiddlewaresModule = await import('../../pacientes/pacienteMiddlewares.js')
    const authMiddlewaresModule = await import('../../auth/middlewares/authMiddlewares.js')
    const errorMiddlewareModule = await import('../../error/errorMiddleware.js')
    const rolesModule = await import('../../auth/roles.js')

    AppDataSource = dataSourceModule.AppDataSource
    Paciente = pacienteEntityModule.Paciente

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }

    await AppDataSource.synchronize(true)

    app = express()
    app.use(express.json())
    app.get(
      '/paciente/:id',
      authMiddlewaresModule.verificaTokenJWT(rolesModule.Role.paciente),
      pacienteMiddlewaresModule.verificaPropriedadePaciente,
      pacienteControllerModule.lerPaciente
    )
    app.use(errorMiddlewareModule.default)

    const outroPaciente = await AppDataSource.manager.save(
      Paciente,
      new Paciente(
        '11111111111',
        'Paciente Dono do Token',
        'dono-token@example.com',
        'hash-senha',
        '11999999999',
        null,
        true,
        null,
        null,
        'Historico privado do dono do token'
      )
    )

    pacienteAlvo = await AppDataSource.manager.save(
      Paciente,
      new Paciente(
        '22222222222',
        'Paciente Alvo',
        'alvo@example.com',
        'hash-senha',
        '11888888888',
        null,
        true,
        null,
        null,
        'Historico privado de outro paciente'
      )
    )

    tokenOutroPaciente = jwt.sign(
      { id: outroPaciente.id, role: rolesModule.Role.paciente },
      fs.readFileSync('src/ssl_certificate/chave-privada.pem', 'utf8'),
      { algorithm: 'RS256', expiresIn: '20m' }
    )
  })

  afterAll(async () => {
    if (AppDataSource?.isInitialized === true) {
      await AppDataSource.destroy()
    }
  })

  it('deve bloquear um paciente autenticado de acessar os dados de outro paciente', async () => {
    const response = await request(app)
      .get(`/paciente/${pacienteAlvo.id}`)
      .set('Authorization', `Bearer ${tokenOutroPaciente}`)

    expect(response.status).toBe(403)
  })
})
