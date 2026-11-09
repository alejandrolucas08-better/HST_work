import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import { APP_NAME } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { EMPRESA, RODAPE_DOCUMENTO, enderecoEmpresa } from "./empresa";

/**
 * =============================================================================
 * Renderizador de PDF compartilhado (pdf-lib)
 * =============================================================================
 * Este módulo concentra o "design system" dos documentos: cabeçalho
 * institucional, tipografia, quebra de linhas, tabelas com repetição de
 * cabeçalho entre páginas, caixas de dados, assinaturas e rodapé paginado.
 *
 * Decisões importantes:
 * - Fontes padrão (Helvetica / Helvetica-Bold) evitam download de arquivos e
 *   funcionam em qualquer runtime Node. Em compensação usam WinAnsi, por isso
 *   `sanitizar()` normaliza símbolos tipográficos antes de desenhar.
 * - O PDF é montado página a página em memória e devolvido como Uint8Array.
 * - Nenhum comentário aqui depende de UI: o mesmo builder serve para a ficha
 *   individual e para o relatório de conformidade.
 * =============================================================================
 */

// Paleta fixa dos documentos (não usa os tokens de tela: PDF é sempre claro).
const COR = {
  ink: rgb(0.06, 0.09, 0.16),
  inkSoft: rgb(0.21, 0.25, 0.33),
  muted: rgb(0.42, 0.45, 0.5),
  line: rgb(0.85, 0.87, 0.9),
  fill: rgb(0.96, 0.97, 0.98),
  brand: rgb(0.04, 0.55, 0.47),
  danger: rgb(0.75, 0.16, 0.16),
  warning: rgb(0.72, 0.45, 0.03),
  white: rgb(1, 1, 1),
} as const;

const A4_RETRATO: [number, number] = [595.28, 841.89];
const A4_PAISAGEM: [number, number] = [841.89, 595.28];
const MARGEM = 36;
const ALTURA_CABECALHO = 64;
const ALTURA_RODAPE = 34;

/** Normaliza texto para os padrões WinAnsi das fontes Standard do pdf-lib. */
function sanitizar(texto: string): string {
  const mapa: Record<string, string> = {
    "\u2014": "-",
    "\u2013": "-",
    "\u201c": '"',
    "\u201d": '"',
    "\u2018": "'",
    "\u2019": "'",
    "\u2022": "-",
    "\u2026": "...",
    "\u00d7": "x",
    "\u2265": ">=",
    "\u2264": "<=",
    "\u2192": "->",
    "\u00a0": " ",
    "\u00ba": "o",
    "\u00aa": "a",
  };

  return texto
    .replace(/\r\n?/g, "\n")
    .replace(
      /[\u2014\u2013\u201c\u201d\u2018\u2019\u2022\u2026\u00d7\u2265\u2264\u2192\u00a0\u00ba\u00aa]/g,
      (char) => mapa[char] ?? "",
    )
    // Mantém apenas o que o WinAnsi consegue codificar (Latin-1 + ASCII).
    .replace(/[^\t\n\r\x20-\x7e\u00a0-\u00ff]/g, "");
}

/** Quebra um texto em linhas que cabem na largura informada. */
function quebrarLinhas(
  texto: string,
  font: PDFFont,
  size: number,
  largura: number,
): string[] {
  const resultado: string[] = [];

  for (const paragrafo of sanitizar(texto).split("\n")) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (palavras.length === 0) {
      resultado.push("");
      continue;
    }

    let linha = "";
    for (const palavra of palavras) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (font.widthOfTextAtSize(tentativa, size) <= largura) {
        linha = tentativa;
        continue;
      }

      if (linha) resultado.push(linha);
      // Palavras isoladas maiores que a coluna são cortadas por caractere.
      if (font.widthOfTextAtSize(palavra, size) > largura) {
        let pedaco = "";
        for (const char of palavra) {
          if (font.widthOfTextAtSize(pedaco + char, size) > largura) {
            resultado.push(pedaco);
            pedaco = char;
          } else {
            pedaco += char;
          }
        }
        linha = pedaco;
      } else {
        linha = palavra;
      }
    }
    resultado.push(linha);
  }

  return resultado;
}

export type ColunaTabela = {
  titulo: string;
  /** Peso proporcional da coluna (a soma é normalizada para a largura útil). */
  peso: number;
  alinhamento?: "left" | "right" | "center";
};

type LinhaTabela = string[];

export type OpcoesTexto = {
  size?: number;
  bold?: boolean;
  color?: RGB;
  lineHeight?: number;
  indent?: number;
  maxWidth?: number;
  align?: "left" | "right" | "center";
};

export class PdfBuilder {
  private readonly doc: PDFDocument;
  private readonly font: PDFFont;
  private readonly bold: PDFFont;
  private readonly titulo: string;
  private readonly subtitulo?: string;
  private readonly paisagem: boolean;
  private page!: PDFPage;
  private pageWidth = 0;
  private pageHeight = 0;
  private y = 0;
  private zebra = 0;

  private constructor(
    doc: PDFDocument,
    font: PDFFont,
    bold: PDFFont,
    titulo: string,
    subtitulo: string | undefined,
    paisagem: boolean,
  ) {
    this.doc = doc;
    this.font = font;
    this.bold = bold;
    this.titulo = titulo;
    this.subtitulo = subtitulo;
    this.paisagem = paisagem;
    this.criarPagina();
  }

  /** Cria o documento já com a primeira página e o cabeçalho institucional. */
  static async criar(opcoes: {
    titulo: string;
    subtitulo?: string;
    paisagem?: boolean;
  }): Promise<PdfBuilder> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    doc.setTitle(sanitizar(opcoes.titulo));
    doc.setAuthor(sanitizar(EMPRESA.nome));
    doc.setSubject(sanitizar(opcoes.subtitulo ?? opcoes.titulo));
    doc.setCreator(APP_NAME);
    doc.setProducer(APP_NAME);
    doc.setCreationDate(new Date());

    return new PdfBuilder(
      doc,
      font,
      bold,
      opcoes.titulo,
      opcoes.subtitulo,
      opcoes.paisagem ?? false,
    );
  }

  get larguraUtil(): number {
    return this.pageWidth - MARGEM * 2;
  }

  get restante(): number {
    return this.y - MARGEM - ALTURA_RODAPE;
  }

  // ---------------------------------------------------------------------------
  // Páginas e cabeçalho
  // ---------------------------------------------------------------------------
  private criarPagina() {
    this.page = this.doc.addPage(this.paisagem ? A4_PAISAGEM : A4_RETRATO);
    this.pageWidth = this.page.getWidth();
    this.pageHeight = this.page.getHeight();
    this.desenharCabecalho();
    this.y = this.pageHeight - ALTURA_CABECALHO - 26;
    this.zebra = 0;
  }

  /** Nova página com o mesmo cabeçalho institucional (usado em quebras). */
  novaPagina() {
    this.criarPagina();
  }

  private desenharCabecalho() {
    const topo = this.pageHeight;

    // Faixa escura institucional + filete verde da marca.
    this.page.drawRectangle({
      x: 0,
      y: topo - ALTURA_CABECALHO,
      width: this.pageWidth,
      height: ALTURA_CABECALHO,
      color: COR.ink,
    });
    this.page.drawRectangle({
      x: 0,
      y: topo - ALTURA_CABECALHO - 3,
      width: this.pageWidth,
      height: 3,
      color: COR.brand,
    });

    // Bloco de identificação da empresa (esquerda).
    this.page.drawText(sanitizar(EMPRESA.nome), {
      x: MARGEM,
      y: topo - 25,
      size: 12.5,
      font: this.bold,
      color: COR.white,
    });
    this.page.drawText(
      sanitizar(`CNPJ ${EMPRESA.cnpj}  |  ${EMPRESA.telefone}  |  ${EMPRESA.email}`),
      {
        x: MARGEM,
        y: topo - 39,
        size: 6.8,
        font: this.font,
        color: rgb(0.78, 0.82, 0.86),
      },
    );
    this.page.drawText(sanitizar(enderecoEmpresa()), {
      x: MARGEM,
      y: topo - 50,
      size: 6.8,
      font: this.font,
      color: rgb(0.78, 0.82, 0.86),
    });

    // Título do documento (direita).
    const titulo = sanitizar(this.titulo.toUpperCase());
    const tituloSize = 9.5;
    this.page.drawText(titulo, {
      x: this.pageWidth - MARGEM - this.bold.widthOfTextAtSize(titulo, tituloSize),
      y: topo - 27,
      size: tituloSize,
      font: this.bold,
      color: COR.white,
    });
    if (this.subtitulo) {
      const sub = sanitizar(this.subtitulo);
      this.page.drawText(sub, {
        x: this.pageWidth - MARGEM - this.font.widthOfTextAtSize(sub, 7),
        y: topo - 39,
        size: 7,
        font: this.font,
        color: rgb(0.78, 0.82, 0.86),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Texto
  // ---------------------------------------------------------------------------
  garantirEspaco(altura: number) {
    if (this.y - altura < MARGEM + ALTURA_RODAPE) this.novaPagina();
  }

  /** Desenha um texto com quebra automática de linha. */
  texto(texto: string, opcoes: OpcoesTexto = {}) {
    const size = opcoes.size ?? 9;
    const font = opcoes.bold ? this.bold : this.font;
    const lineHeight = opcoes.lineHeight ?? size * 1.35;
    const indent = opcoes.indent ?? 0;
    const maxWidth = opcoes.maxWidth ?? this.larguraUtil - indent;
    const linhas = quebrarLinhas(texto, font, size, maxWidth);

    for (const linha of linhas) {
      this.garantirEspaco(lineHeight);
      let x = MARGEM + indent;
      if (opcoes.align === "right") {
        x = MARGEM + indent + maxWidth - font.widthOfTextAtSize(linha, size);
      } else if (opcoes.align === "center") {
        x = MARGEM + indent + (maxWidth - font.widthOfTextAtSize(linha, size)) / 2;
      }
      this.page.drawText(linha, {
        x,
        y: this.y - size,
        size,
        font,
        color: opcoes.color ?? COR.inkSoft,
      });
      this.y -= lineHeight;
    }
  }

  /** Título de seção com filete, usado para separar blocos do documento. */
  secao(titulo: string) {
    this.garantirEspaco(30);
    this.y -= 8;
    const texto = sanitizar(titulo.toUpperCase());
    this.page.drawText(texto, {
      x: MARGEM,
      y: this.y - 8,
      size: 8.5,
      font: this.bold,
      color: COR.ink,
    });
    this.page.drawLine({
      start: { x: MARGEM, y: this.y - 13 },
      end: { x: this.pageWidth - MARGEM, y: this.y - 13 },
      thickness: 0.8,
      color: COR.brand,
    });
    this.y -= 22;
  }

  espaco(altura = 6) {
    this.garantirEspaco(altura);
    this.y -= altura;
  }

  // ---------------------------------------------------------------------------
  // Caixas de dados (empresa / colaborador)
  // ---------------------------------------------------------------------------
  caixaDados(pares: Array<[string, string]>, colunas = 2) {
    const size = 8.5;
    const labelSize = 6.3;
    const padding = 8;
    const gap = 14;
    const porColuna = Math.ceil(pares.length / colunas);
    const larguraColuna = (this.larguraUtil - padding * 2 - gap * (colunas - 1)) / colunas;

    // Mede a maior altura de linha por coluna para dimensionar a caixa.
    let alturaConteudo = 0;
    for (let c = 0; c < colunas; c++) {
      let alturaColuna = 0;
      for (let i = 0; i < porColuna; i++) {
        const par = pares[c * porColuna + i];
        if (!par) continue;
        const linhas = quebrarLinhas(par[1], this.bold, size, larguraColuna);
        alturaColuna += labelSize + 3 + linhas.length * size * 1.25 + 5;
      }
      alturaConteudo = Math.max(alturaConteudo, alturaColuna);
    }

    const altura = alturaConteudo + padding * 2;
    this.garantirEspaco(altura + 4);
    const topo = this.y;

    this.page.drawRectangle({
      x: MARGEM,
      y: topo - altura,
      width: this.larguraUtil,
      height: altura,
      color: COR.fill,
      borderColor: COR.line,
      borderWidth: 0.6,
    });

    for (let c = 0; c < colunas; c++) {
      let cursor = topo - padding;
      const x = MARGEM + padding + c * (larguraColuna + gap);
      for (let i = 0; i < porColuna; i++) {
        const par = pares[c * porColuna + i];
        if (!par) continue;
        this.page.drawText(sanitizar(par[0].toUpperCase()), {
          x,
          y: cursor - labelSize,
          size: labelSize,
          font: this.bold,
          color: COR.muted,
        });
        cursor -= labelSize + 3;
        for (const linha of quebrarLinhas(par[1], this.bold, size, larguraColuna)) {
          this.page.drawText(linha, {
            x,
            y: cursor - size,
            size,
            font: this.bold,
            color: COR.ink,
          });
          cursor -= size * 1.25;
        }
        cursor -= 5;
      }
    }

    this.y = topo - altura - 10;
  }

  // ---------------------------------------------------------------------------
  // Tabelas paginadas
  // ---------------------------------------------------------------------------
  tabela(opcoes: {
    colunas: ColunaTabela[];
    linhas: LinhaTabela[];
    size?: number;
    vazio?: string;
  }) {
    const size = opcoes.size ?? 7.2;
    const lineHeight = size * 1.25;
    const paddingX = 3.5;
    const paddingY = 4;
    const alturaCabecalho = 16;
    const totalPeso = opcoes.colunas.reduce((soma, coluna) => soma + coluna.peso, 0);
    const larguras = opcoes.colunas.map(
      (coluna) => (coluna.peso / totalPeso) * this.larguraUtil,
    );

    const desenharCabecalho = () => {
      if (this.y - alturaCabecalho < MARGEM + ALTURA_RODAPE) this.novaPagina();
      this.page.drawRectangle({
        x: MARGEM,
        y: this.y - alturaCabecalho,
        width: this.larguraUtil,
        height: alturaCabecalho,
        color: COR.ink,
      });

      let x = MARGEM;
      opcoes.colunas.forEach((coluna, indice) => {
        const texto = sanitizar(coluna.titulo.toUpperCase());
        const largura = larguras[indice];
        let tx = x + paddingX;
        if (coluna.alinhamento === "right") {
          tx = x + largura - paddingX - this.bold.widthOfTextAtSize(texto, size);
        } else if (coluna.alinhamento === "center") {
          tx =
            x + (largura - this.bold.widthOfTextAtSize(texto, size)) / 2;
        }
        this.page.drawText(texto, {
          x: tx,
          y: this.y - alturaCabecalho + 5,
          size,
          font: this.bold,
          color: COR.white,
        });
        x += largura;
      });

      this.y -= alturaCabecalho;
      this.zebra = 0;
    };

    desenharCabecalho();

    if (opcoes.linhas.length === 0) {
      this.garantirEspaco(24);
      this.page.drawText(sanitizar(opcoes.vazio ?? "Nenhum registro encontrado."), {
        x: MARGEM + paddingX,
        y: this.y - 14,
        size,
        font: this.font,
        color: COR.muted,
      });
      this.y -= 24;
      return;
    }

    for (const linha of opcoes.linhas) {
      // 1) Pré-calcula as linhas de cada célula para saber a altura da linha.
      const celulas = linha.map((valor, indice) =>
        quebrarLinhas(valor ?? "", this.font, size, larguras[indice] - paddingX * 2),
      );
      const maior = Math.max(...celulas.map((linhas) => linhas.length), 1);
      const alturaLinha = maior * lineHeight + paddingY * 2;

      // 2) Se não couber, abre nova página e repete o cabeçalho da tabela.
      if (this.y - alturaLinha < MARGEM + ALTURA_RODAPE) {
        this.novaPagina();
        desenharCabecalho();
      }

      // 3) Zebra melhora a leitura de tabelas longas em papel.
      if (this.zebra % 2 === 1) {
        this.page.drawRectangle({
          x: MARGEM,
          y: this.y - alturaLinha,
          width: this.larguraUtil,
          height: alturaLinha,
          color: COR.fill,
        });
      }

      let x = MARGEM;
      linha.forEach((_, indice) => {
        const largura = larguras[indice];
        const alinhamento = opcoes.colunas[indice]?.alinhamento ?? "left";
        let cy = this.y - paddingY;
        for (const textoLinha of celulas[indice]) {
          let tx = x + paddingX;
          if (alinhamento === "right") {
            tx = x + largura - paddingX - this.font.widthOfTextAtSize(textoLinha, size);
          } else if (alinhamento === "center") {
            tx = x + (largura - this.font.widthOfTextAtSize(textoLinha, size)) / 2;
          }
          this.page.drawText(textoLinha, {
            x: tx,
            y: cy - size,
            size,
            font: this.font,
            color: COR.inkSoft,
          });
          cy -= lineHeight;
        }
        x += largura;
      });

      this.page.drawLine({
        start: { x: MARGEM, y: this.y - alturaLinha },
        end: { x: this.pageWidth - MARGEM, y: this.y - alturaLinha },
        thickness: 0.4,
        color: COR.line,
      });

      this.y -= alturaLinha;
      this.zebra += 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Assinaturas digitalizadas
  // ---------------------------------------------------------------------------
  /**
   * Embute uma assinatura Base64 no PDF. Aceita PNG e JPEG (formatos emitidos
   * pelo canvas). SVG é deliberadamente ignorado: o pdf-lib não rasteriza SVG,
   * e a assinatura SVG continua visível no modal/comprovante da interface.
   */
  async assinatura(
    dataUrl: string | null | undefined,
    opcoes: { legenda?: string; altura?: number } = {},
  ): Promise<boolean> {
    const imagem = await carregarImagem(this.doc, dataUrl);
    const altura = opcoes.altura ?? 54;
    const alturaCaixa = altura + 18;

    this.garantirEspaco(alturaCaixa + 6);
    const topo = this.y;
    this.page.drawRectangle({
      x: MARGEM,
      y: topo - alturaCaixa,
      width: this.larguraUtil,
      height: alturaCaixa,
      borderColor: COR.line,
      borderWidth: 0.7,
      color: COR.white,
    });

    if (imagem) {
      const escala = Math.min(
        (this.larguraUtil - 24) / imagem.width,
        altura / imagem.height,
      );
      const larguraFinal = imagem.width * escala;
      const alturaFinal = imagem.height * escala;
      this.page.drawImage(imagem, {
        x: MARGEM + (this.larguraUtil - larguraFinal) / 2,
        y: topo - 9 - alturaFinal,
        width: larguraFinal,
        height: alturaFinal,
      });
    } else {
      this.page.drawText("Assinatura digital não disponível neste formato.", {
        x: MARGEM + 10,
        y: topo - 26,
        size: 7,
        font: this.font,
        color: COR.muted,
      });
    }

    if (opcoes.legenda) {
      this.page.drawText(sanitizar(opcoes.legenda), {
        x: MARGEM + 8,
        y: topo - alturaCaixa + 5,
        size: 6.5,
        font: this.font,
        color: COR.muted,
      });
    }

    this.y = topo - alturaCaixa - 8;
    return Boolean(imagem);
  }

  // ---------------------------------------------------------------------------
  // Finalização
  // ---------------------------------------------------------------------------
  async finalizar(): Promise<Uint8Array> {
    const paginas = this.doc.getPages();
    const total = paginas.length;
    const geradoEm = formatDateTime(new Date());

    paginas.forEach((pagina, indice) => {
      const largura = pagina.getWidth();
      pagina.drawLine({
        start: { x: MARGEM, y: MARGEM + 12 },
        end: { x: largura - MARGEM, y: MARGEM + 12 },
        thickness: 0.5,
        color: COR.line,
      });
      const rodape = quebrarLinhas(
        `${RODAPE_DOCUMENTO}  Gerado em ${geradoEm}.`,
        this.font,
        5.8,
        largura - MARGEM * 2 - 90,
      )[0];
      pagina.drawText(rodape, {
        x: MARGEM,
        y: MARGEM + 3,
        size: 5.8,
        font: this.font,
        color: COR.muted,
      });
      const rotulo = sanitizar(`Página ${indice + 1} de ${total}`);
      pagina.drawText(rotulo, {
        x: largura - MARGEM - this.font.widthOfTextAtSize(rotulo, 6.5),
        y: MARGEM + 3,
        size: 6.5,
        font: this.font,
        color: COR.muted,
      });
    });

    return this.doc.save();
  }
}

/** Decodifica um data URL PNG/JPEG em imagem embutível. Retorna null se inválido. */
export async function carregarImagem(
  doc: PDFDocument,
  dataUrl: string | null | undefined,
): Promise<PDFImage | null> {
  if (!dataUrl) return null;
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;

  try {
    const bytes = Buffer.from(match[2], "base64");
    return match[1].toLowerCase() === "png"
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes);
  } catch {
    // Assinatura corrompida não deve impedir a emissão do documento.
    return null;
  }
}

export { COR as CORES_PDF };
