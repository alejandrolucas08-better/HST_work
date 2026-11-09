/**
 * =============================================================================
 * Dados institucionais usados nos documentos PDF (ficha e relatórios)
 * =============================================================================
 * Todos os campos vêm de variáveis de ambiente para que cada empresa possa
 * emitir seus documentos com o próprio cabeçalho sem alterar código.
 * Ver `.env.example` (bloco "Empresa / documentos").
 * =============================================================================
 */
export const EMPRESA = {
  nome: process.env.COMPANY_NAME ?? "HST Segurança do Trabalho",
  cnpj: process.env.COMPANY_CNPJ ?? "00.000.000/0001-00",
  endereco: process.env.COMPANY_ADDRESS ?? "Av. Industrial, 1000 - Distrito Industrial",
  cidade: process.env.COMPANY_CITY ?? "São Paulo",
  uf: process.env.COMPANY_STATE ?? "SP",
  cep: process.env.COMPANY_CEP ?? "00000-000",
  telefone: process.env.COMPANY_PHONE ?? "(11) 0000-0000",
  email: process.env.COMPANY_EMAIL ?? "sst@hst.local",
  responsavel: process.env.COMPANY_RESPONSIBLE_NAME ?? "Administrador HST",
  cargoResponsavel:
    process.env.COMPANY_RESPONSIBLE_ROLE ?? "Técnico de Segurança do Trabalho",
} as const;

export function enderecoEmpresa(): string {
  return `${EMPRESA.endereco} - ${EMPRESA.cidade}/${EMPRESA.uf} - CEP ${EMPRESA.cep}`;
}

/**
 * Termos legais de responsabilidade pelo uso do EPI.
 * Base legal: art. 166 da CLT e NR-6 (Portaria SEPRT nº 6.734/2009).
 * Renderizados na ficha individual e no comprovante para dar validade ao
 * documento em auditorias trabalhistas.
 */
export const TERMOS_RESPONSABILIDADE_EPI: readonly string[] = [
  "Declaro ter recebido gratuitamente o(s) Equipamento(s) de Proteção Individual (EPI) descrito(s) neste documento, em perfeito estado de conservação e funcionamento, bem como as orientações quanto ao uso, guarda, conservação e higienização.",
  "Comprometo-me a utilizar o EPI exclusivamente para a finalidade a que se destina, durante toda a jornada de trabalho, e a comunicar imediatamente ao empregador qualquer alteração, dano, extravio ou perda, bem como a necessidade de substituição.",
  "Estou ciente de que o uso correto do EPI é obrigatório nos termos do art. 166 da CLT e da NR-6, sendo minha responsabilidade a guarda e a conservação do equipamento fornecido.",
  "A recusa injustificada ao uso, o uso inadequado ou a danificação proposital do EPI poderão ensejar as medidas disciplinares cabíveis, na forma da legislação trabalhista.",
  "O empregador compromete-se a fornecer o EPI adequado ao risco, treinar o trabalhador quanto ao uso correto, substituir o equipamento quando danificado ou extraviado e manter os registros de entrega para fins de fiscalização.",
];

export const RODAPE_DOCUMENTO =
  "Documento gerado eletronicamente pelo sistema de gestão de EPIs. Válido como comprovante de entrega e recebimento para fins de auditoria de SST.";
