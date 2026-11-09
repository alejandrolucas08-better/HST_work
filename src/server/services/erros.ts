/**
 * Erro de domínio com código estável para a API e status HTTP apropriado.
 * Server Actions convertem este erro em mensagem de formulário; as API Routes
 * o serializam em JSON.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[] | undefined>;

  constructor(
    code: string,
    message: string,
    options: {
      status?: number;
      fieldErrors?: Record<string, string[] | undefined>;
    } = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = options.status ?? 400;
    this.fieldErrors = options.fieldErrors;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
