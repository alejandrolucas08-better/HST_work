/**
 * Erro de domínio com código estável para a API e status HTTP apropriado.
 * Server Actions convertem este erro em mensagem de formulário; as API Routes
 * o serializam em JSON.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[] | undefined>;
  /** Cabeçalhos extras (ex.: Retry-After em respostas 429). */
  readonly headers?: Record<string, string>;

  constructor(
    code: string,
    message: string,
    options: {
      status?: number;
      fieldErrors?: Record<string, string[] | undefined>;
      headers?: Record<string, string>;
    } = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = options.status ?? 400;
    this.fieldErrors = options.fieldErrors;
    this.headers = options.headers;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
