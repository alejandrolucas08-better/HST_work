export type DeliveryColaborador = {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  setor: string;
};

export type DeliveryEpi = {
  id: string;
  nome: string;
  numeroCA: string;
  dataValidadeCA: string;
  quantidadeEstoque: number;
  intervaloTrocaDias: number;
};

export type DeliveryMetodo = "assinatura" | "pin";
