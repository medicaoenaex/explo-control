/** Violação de regra de negócio: mensagem pensada para o usuário final. */
export class RegraNegocioError extends Error {
  constructor(message: string, public readonly codigo: string) {
    super(message);
    this.name = "RegraNegocioError";
  }
}
