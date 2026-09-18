import { Router } from 'express'
import { verificaTokenJWT } from '../auth/middlewares/authMiddlewares.js'

import multer from 'multer'
import { Role } from '../auth/roles.js'
import multerConfig from '../config/multer.js'
import { criaImagem, destroiImagem, listaImagemPaciente } from './PacienteImagemController.js'
import { verificaPropriedadePaciente } from './pacienteMiddlewares.js'
import {
  atualizarEnderecoPaciente,
  consultaPorPaciente,
  atualizarPaciente,
  criarPaciente,
  desativaPaciente,
  exibeTodosPacientes,
  lerPaciente,
  listaConsultasPaciente,
} from './pacienteController.js'

const upload = multer(multerConfig)

export const pacienteRouter = Router()

pacienteRouter.get('/', exibeTodosPacientes)
pacienteRouter.get('/consulta-por-paciente', consultaPorPaciente)
pacienteRouter.post('/', criarPaciente)
pacienteRouter.get('/:id', verificaTokenJWT(Role.paciente), verificaPropriedadePaciente, lerPaciente)
pacienteRouter.get('/:id/consultas', verificaTokenJWT(Role.paciente), verificaPropriedadePaciente, listaConsultasPaciente)
pacienteRouter.put('/:id', verificaTokenJWT(Role.paciente), verificaPropriedadePaciente, atualizarPaciente)
pacienteRouter.delete(
  '/:id',
  verificaTokenJWT(Role.paciente),
  verificaPropriedadePaciente,
  desativaPaciente
)
pacienteRouter.patch(
  '/:id',
  verificaTokenJWT(Role.paciente),
  verificaPropriedadePaciente,
  atualizarEnderecoPaciente
)

pacienteRouter.post(
  '/:id/images',
  upload.single('file'),
  criaImagem
)

pacienteRouter.get(
  '/:id/images',
  upload.single('file'),
  listaImagemPaciente
)

pacienteRouter.delete(
  '/:id/images',
  verificaTokenJWT(Role.paciente),
  verificaPropriedadePaciente,
  destroiImagem
)

export default (app) => {
  app.use('/paciente', pacienteRouter)
}
