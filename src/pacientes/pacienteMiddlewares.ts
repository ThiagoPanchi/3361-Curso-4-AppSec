import { type NextFunction, type Request, type Response } from 'express'

export function verificaPropriedadePaciente (
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.userId == null || req.userId !== req.params.id) {
    res.status(403).json({ message: 'Não autorizado' })
    return
  }

  next()
}
