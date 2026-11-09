/**
 * =============================================================================
 * Validação de assinaturas digitais recebidas do tablet
 * =============================================================================
 * A assinatura chega como data URL Base64 e é persistida no banco. Como esse
 * conteúdo é exibido em <img> e embutido em PDFs, ele NÃO pode ser confiado:
 *
 *   1. apenas PNG ou JPEG (SVG e outros formatos são rejeitados — SVG pode
 *      conter scripts e o pdf-lib não o rasteriza);
 *   2. o Base64 é decodificado de verdade (não basta olhar o prefixo);
 *   3. os magic bytes precisam corresponder ao MIME declarado;
 *   4. tamanho decodificado e dimensões são limitados para evitar payloads
 *      gigantes / bombas de descompressão no renderizador de PDF;
 *   5. o valor devolvido é canônico, pronto para armazenamento e exibição.
 *
 * O módulo é isomórfico (não usa Buffer/fs) para poder ser reaproveitado no
 * schema Zod, no serviço, no PDF e no componente de comprovante.
 * =============================================================================
 */

export const ASSINATURA_MAX_CHARS = 720_000; // ~540 KiB de Base64
export const ASSINATURA_MAX_BYTES = 512 * 1024; // 512 KiB decodificados
export const ASSINATURA_MAX_DIMENSAO = 4096; // pixels (largura ou altura)
export const ASSINATURA_MAX_AREA = 16_777_216; // 4096 x 4096

export type AssinaturaMime = "image/png" | "image/jpeg";

export type AssinaturaValidada = {
  mime: AssinaturaMime;
  base64: string;
  bytes: Uint8Array;
  largura: number;
  altura: number;
};

export type ResultadoAssinatura =
  | { ok: true; assinatura: AssinaturaValidada }
  | { ok: false; motivo: string };

// Tabela de decodificação Base64 (ASCII -> valor 0..63; 255 = inválido).
const INDICE_BASE64 = new Uint8Array(128).fill(255);
for (let i = 0; i < 26; i += 1) INDICE_BASE64[65 + i] = i; // A-Z
for (let i = 0; i < 26; i += 1) INDICE_BASE64[97 + i] = 26 + i; // a-z
for (let i = 0; i < 10; i += 1) INDICE_BASE64[48 + i] = 52 + i; // 0-9
INDICE_BASE64[43] = 62; // +
INDICE_BASE64[47] = 63; // /

/** Decodifica Base64 estrito (sem espaços, sem caracteres fora do alfabeto). */
function decodificarBase64(texto: string): Uint8Array | null {
  if (texto.length === 0 || texto.length % 4 !== 0) return null;

  const padding = texto.endsWith("==") ? 2 : texto.endsWith("=") ? 1 : 0;
  const tamanho = (texto.length / 4) * 3 - padding;
  if (tamanho <= 0) return null;

  const bytes = new Uint8Array(tamanho);
  let buffer = 0;
  let bits = 0;
  let indice = 0;

  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i);

    if (codigo === 61) {
      // "=" só é válido no final, na quantidade exata de padding.
      if (i < texto.length - padding) return null;
      continue;
    }

    const valor = codigo < 128 ? INDICE_BASE64[codigo] : 255;
    if (valor === 255) return null;

    buffer = (buffer << 6) | valor;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      const byte = (buffer >> bits) & 0xff;
      if (indice >= bytes.length) return null;
      bytes[indice] = byte;
      indice += 1;
      // Mantém somente os bits que ainda não foram consumidos.
      buffer &= (1 << bits) - 1;
    }
  }

  return indice === tamanho ? bytes : null;
}

function ehPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function ehJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Lê largura/altura do IHDR do PNG (offsets fixos após a assinatura). */
function dimensoesPng(bytes: Uint8Array): { largura: number; altura: number } | null {
  if (bytes.length < 24) return null;
  // "IHDR" precisa estar no primeiro chunk, logo após o tamanho do chunk.
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { largura: view.getUint32(16, false), altura: view.getUint32(20, false) };
}

/** Percorre os marcadores JPEG até o SOF (Start Of Frame) e lê as dimensões. */
function dimensoesJpeg(bytes: Uint8Array): { largura: number; altura: number } | null {
  let offset = 2;

  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marcador = bytes[offset + 1];
    if (marcador === 0xff) {
      offset += 1;
      continue;
    }
    if (marcador === 0x00 || (marcador >= 0xd0 && marcador <= 0xd9)) {
      offset += 2;
      continue;
    }

    const tamanho = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (tamanho < 2) return null;

    const ehSof =
      marcador >= 0xc0 &&
      marcador <= 0xcf &&
      marcador !== 0xc4 && // DHT
      marcador !== 0xc8 && // JPG
      marcador !== 0xcc; // DAC

    if (ehSof) {
      const altura = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const largura = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return { largura, altura };
    }

    offset += 2 + tamanho;
  }

  return null;
}

/**
 * Valida e decodifica um data URL de assinatura.
 * Retorna o motivo da rejeição (sem ecoar o payload recebido).
 */
export function validarAssinaturaDigital(
  dataUrl: string | null | undefined,
): ResultadoAssinatura {
  if (!dataUrl) return { ok: false, motivo: "Assinatura ausente." };
  if (dataUrl.length > ASSINATURA_MAX_CHARS) {
    return { ok: false, motivo: "Assinatura muito grande." };
  }

  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(
    dataUrl.trim(),
  );
  if (!match) {
    return { ok: false, motivo: "Formato de assinatura inválido (use PNG ou JPEG)." };
  }

  const declarado = match[1].toLowerCase();
  const mime: AssinaturaMime = declarado === "png" ? "image/png" : "image/jpeg";
  const base64 = match[2];

  // Limita antes de decodificar: evita alocar memória para payloads abusivos.
  const tamanhoEstimado = Math.floor((base64.length / 4) * 3);
  if (tamanhoEstimado <= 0 || tamanhoEstimado > ASSINATURA_MAX_BYTES) {
    return { ok: false, motivo: "Assinatura excede o tamanho máximo permitido." };
  }

  const bytes = decodificarBase64(base64);
  if (!bytes || bytes.length === 0 || bytes.length > ASSINATURA_MAX_BYTES) {
    return { ok: false, motivo: "Assinatura Base64 inválida ou muito grande." };
  }

  // O MIME declarado precisa casar com os magic bytes reais.
  const realmentePng = ehPng(bytes);
  const realmenteJpeg = ehJpeg(bytes);
  if ((mime === "image/png" && !realmentePng) || (mime === "image/jpeg" && !realmenteJpeg)) {
    return { ok: false, motivo: "O conteúdo da assinatura não corresponde ao formato declarado." };
  }

  const dimensoes = realmentePng ? dimensoesPng(bytes) : dimensoesJpeg(bytes);
  if (!dimensoes || dimensoes.largura < 1 || dimensoes.altura < 1) {
    return { ok: false, motivo: "Não foi possível ler as dimensões da assinatura." };
  }
  if (
    dimensoes.largura > ASSINATURA_MAX_DIMENSAO ||
    dimensoes.altura > ASSINATURA_MAX_DIMENSAO ||
    dimensoes.largura * dimensoes.altura > ASSINATURA_MAX_AREA
  ) {
    return { ok: false, motivo: "Dimensões da assinatura excedem o limite permitido." };
  }

  return {
    ok: true,
    assinatura: { mime, base64, bytes, largura: dimensoes.largura, altura: dimensoes.altura },
  };
}

/** Atalho para o schema Zod. */
export function assinaturaDigitalValida(dataUrl: string | null | undefined): boolean {
  return validarAssinaturaDigital(dataUrl).ok;
}

/**
 * Retorna o data URL canônico (MIME e Base64 normalizados) ou null se inválido.
 * Use antes de persistir para nunca gravar um formato não suportado.
 */
export function normalizarAssinatura(dataUrl: string | null | undefined): string | null {
  const resultado = validarAssinaturaDigital(dataUrl);
  if (!resultado.ok) return null;
  return `data:${resultado.assinatura.mime};base64,${resultado.assinatura.base64}`;
}

/**
 * Entrega os bytes prontos para o pdf-lib. Assinaturas inválidas ou antigas em
 * SVG simplesmente não são embutidas (o documento continua sendo emitido).
 */
export function assinaturaParaPdf(
  dataUrl: string | null | undefined,
): { bytes: Uint8Array; mime: AssinaturaMime } | null {
  const resultado = validarAssinaturaDigital(dataUrl);
  if (!resultado.ok) return null;
  return { bytes: resultado.assinatura.bytes, mime: resultado.assinatura.mime };
}
