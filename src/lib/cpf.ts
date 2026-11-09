/** Remove máscara e mantém apenas os 11 dígitos do CPF. */
export function normalizarCpf(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** Validação completa dos dígitos verificadores (não apenas o formato). */
export function isCpfValido(value: string): boolean {
  const cpf = normalizarCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigito = (base: string, pesoInicial: number) => {
    const soma = base
      .split("")
      .reduce((acc, digito, index) => acc + Number(digito) * (pesoInicial - index), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = calcDigito(cpf.slice(0, 9), 10);
  const dv2 = calcDigito(cpf.slice(0, 10), 11);
  return dv1 === Number(cpf[9]) && dv2 === Number(cpf[10]);
}

export function formatarCpf(value: string): string {
  const cpf = normalizarCpf(value);
  if (cpf.length !== 11) return value;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
