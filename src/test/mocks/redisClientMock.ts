export default class ClienteRedisMock {
  async adiciona (): Promise<void> {}
  async buscaValor (): Promise<string | null> { return null }
  async contemChave (): Promise<boolean> { return false }
  async deleta (): Promise<void> {}
}
