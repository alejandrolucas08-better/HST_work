# HST EPI — Gestão Inteligente de EPIs

Sistema web (tablet-first) para controlar o ciclo de vida de Equipamentos de Proteção
Individual: cadastro de EPIs e colaboradores, validade do CA, estoque mínimo, entrega
digital com PIN/assinatura e alertas de troca e vencimento.

> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
> Prisma 6 · PostgreSQL (compatível com Supabase) · Zod · JWT httpOnly ·
> Framer Motion · React Hook Form

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Regras de negócio](#regras-de-negócio)
- [Arquitetura](#arquitetura)
- [Interface, temas e acessibilidade](#interface-temas-e-acessibilidade)
- [Como rodar localmente](#como-rodar-localmente)
- [Credenciais de demonstração](#credenciais-de-demonstração)
- [API REST](#api-rest)
- [Papéis e permissões](#papéis-e-permissões)
- [Deploy](#deploy)
- [Segurança](#segurança)

---

## Funcionalidades

- **Autenticação segura** de operadores de almoxarifado e gestores, com sessão JWT em
  cookie `httpOnly`, hash bcrypt e rate limit de login por IP + e-mail.
- **CRUD completo de EPIs**: nome, número do CA, validade do CA, estoque atual, estoque
  mínimo e intervalo de troca. Exclusão é lógica (arquivamento), preservando histórico.
- **CRUD completo de colaboradores**: nome, CPF validado, cargo, setor, status e PIN
  pessoal (armazenado apenas como hash bcrypt).
- **Entrega digital**: baixa automática de estoque e registro imutável de movimentação,
  com validação por **PIN de 4 a 6 dígitos OU assinatura digital em base64**.
- **Bloqueio de entrega com CA vencido** (regra crítica de SST).
- **Alertas** de estoque abaixo do mínimo, CAs vencidos/a vencer em 30, 60 e 90 dias e
  trocas de EPI próximas ou atrasadas.
- **Devolução** de EPI com opção de reintegrar ao estoque (sempre auditada).
- **Dashboard** com indicadores e listas de ação para o almoxarife.
- Interface em português, com foco em uso em tablet.

## Regras de negócio

| Regra | Comportamento |
| --- | --- |
| CA vencido | A entrega é **bloqueada** (HTTP `409`, código `CA_VENCIDO`). |
| Estoque insuficiente | Bloqueado com `409` / `ESTOQUE_INSUFICIENTE`; a checagem usa `updateMany` condicional para evitar saldo negativo em entregas concorrentes. |
| Baixa de estoque | Toda entrega decrementa o saldo e grava `MovimentacaoEstoque` na mesma transação. |
| Validação digital | PIN **ou** assinatura. Se o PIN for informado, ele precisa conferir (`PIN_INCORRETO`, `422`). Assinatura sozinha é aceita e grava `pinValidado = false`. |
| PIN | Nunca é retornado por APIs; é persistido como hash bcrypt. |
| Troca prevista | Calculada no servidor: `data da entrega + intervaloTrocaDias`. |
| Exclusão | Sem `DELETE` físico: EPI fica `ativo = false`; colaborador fica `DESLIGADO`. |
| Colaborador inativo/desligado | Não pode receber novas entregas. |
| Alteração manual de estoque | Gera movimentação do tipo `AJUSTE` na auditoria. |
| Desligar colaborador | Somente usuários `ADMIN`. |

## Arquitetura

```
src/
├─ app/
│  ├─ (app)/                 # Área autenticada (layout valida a sessão)
│  │  ├─ dashboard/
│  │  ├─ colaboradores/      # Lista + detalhe
│  │  ├─ epis/
│  │  └─ entregas/           # Lista + nova entrega
│  ├─ api/                   # API REST (JSON)
│  └─ login/
├─ components/               # UI, formulários, assinatura, badges
├─ lib/                      # auth, sessão JWT, validações Zod, CPF, formatação
└─ server/
   ├─ actions/               # Server Actions (formulários)
   ├─ queries/               # Consultas de leitura
   ├─ services/              # Regras de negócio (fonte única)
   ├─ http.ts                # Helpers de auth/erro/resposta da API
   └─ selects.ts             # Projeções que nunca expõem hashes
prisma/
├─ schema.prisma
├─ seed.ts
└─ migrations/0001_init/
```

A lógica de negócio fica em `src/server/services` e é reutilizada tanto pelas
**Server Actions** (formulários) quanto pelas **API Routes** (integrações).

### Erros de domínio

Os serviços lançam `DomainError` com `code`, `message`, `status` HTTP e, quando útil,
`fieldErrors`. A API responde:

```json
{
  "ok": false,
  "error": {
    "code": "ESTOQUE_INSUFICIENTE",
    "message": "Estoque insuficiente. Disponível: 2 unidade(s).",
    "details": { "quantidade": ["Disponível em estoque: 2."] }
  }
}
```

Códigos principais: `CREDENCIAIS_INVALIDAS`, `MUITAS_TENTATIVAS`,
`COLABORADOR_NAO_ENCONTRADO`, `COLABORADOR_INATIVO`, `CPF_DUPLICADO`,
`EPI_NAO_ENCONTRADO`, `CA_DUPLICADO`, `CA_VENCIDO`, `ESTOQUE_INSUFICIENTE`,
`PIN_INCORRETO`, `VALIDACAO_DIGITAL_AUSENTE`, `ENTREGA_NAO_ENCONTRADA`,
`ENTREGA_JA_FINALIZADA`, `SEM_PERMISSAO`, `NAO_AUTENTICADO`.

## Interface, temas e acessibilidade

A interface é **tablet-first** e usa três temas selecionáveis pelo botão no cabeçalho
(ou pela sidebar): **Claro**, **Escuro** e **Alto contraste industrial**. A escolha é
persistida em `localStorage` e aplicada antes da primeira pintura por um script
bloqueante, sem “flash” de tema.

- **Tokens semânticos** em `src/app/globals.css` (`bg-surface`, `text-fg`, `border-line`,
  `bg-brand`, `bg-danger`…) mapeados via `@theme inline`. Trocar o atributo
  `data-theme` no `<html>` troca a paleta inteira sem re-render.
- **Alto contraste:** fundo preto puro, texto branco e bordas amarelas/brancas de 2px+;
  sombras decorativas são removidas e o foco recebe contorno reforçado.
- **Alvos de toque:** botões, campos e ações têm no mínimo 48px, com feedback
  `active:scale-95` imediato (CSS, sem depender de JavaScript).
- **Framer Motion:** cards do dashboard entram em cascata, o painel de alertas anima
  com pulso nos itens críticos, modais usam glassmorphism e as abas de validação
  deslizam com layout animation. `MotionConfig reducedMotion="user"` respeita a
  preferência do sistema.
- **Entrega rápida:** busca em tempo real por nome/CPF e nome/CA, cards de EPI com CA e
  estoque, bloqueio visual de EPI vencido/sem saldo e modal de confirmação com duas
  abas:
  - **Assinatura** (`src/components/delivery/signature-canvas.tsx`): Pointer Events
    unificam dedo, caneta e mouse; `setPointerCapture` mantém o traço ao sair da área;
    `touch-action: none` evita rolagem; o canvas usa `devicePixelRatio` e captura PNG em
    Base64.
  - **PIN** (`src/components/delivery/pin-numpad.tsx`): teclado virtual com teclas de
    64px, som curto (Web Audio), vibração opcional e _shake_ em erro. O hash é validado
    somente no servidor.
- **Formulário:** a nova entrega usa React Hook Form + `zodResolver` para feedback
  imediato; o servidor revalida tudo (CPF, CA, estoque, PIN/assinatura) na transação.

#### Componentes principais

| Arquivo | Responsabilidade |
| --- | --- |
| `src/components/theme/*` | Provider, script sem flash, alternador triplo. |
| `src/components/dashboard/dashboard-view.tsx` | KPIs animados, alertas pulsantes e painéis. |
| `src/components/forms/delivery-form.tsx` | Busca, seleção e orquestração da entrega. |
| `src/components/delivery/delivery-confirm-modal.tsx` | Modal de confirmação com abas. |
| `src/components/delivery/signature-canvas.tsx` | Captura de assinatura (Base64). |
| `src/components/delivery/pin-numpad.tsx` | Teclado de PIN com feedback. |

## Como rodar localmente

### 1. Pré-requisitos

- Node.js 20.9+
- PostgreSQL 16 (local) ou uma instância Supabase

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Ajuste `DATABASE_URL`, `DIRECT_URL` e gere um `AUTH_SECRET` forte:

```bash
openssl rand -base64 32
```

### 4. Subir o banco com Docker (opcional)

```bash
docker compose up -d
```

### 5. Migrar, semear e rodar

```bash
npm run db:deploy     # aplica prisma/migrations
npm run db:seed       # dados de demonstração
npm run dev
```

Acesse <http://localhost:3000>. Para criar uma nova migração durante o
desenvolvimento, use `npm run db:migrate`.

### Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `prisma generate` + build de produção |
| `npm start` | Servidor de produção |
| `npm run typecheck` | Verificação TypeScript |
| `npm run db:validate` | Valida o schema Prisma |
| `npm run db:migrate` | Cria/aplica migração em dev |
| `npm run db:deploy` | Aplica migrações em produção |
| `npm run db:seed` | Popula dados de demonstração |
| `npm run db:studio` | Prisma Studio |

## Credenciais de demonstração

Criadas por `npm run db:seed` (altere em produção):

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@hst.local` | `Admin@123` |
| Almoxarife | `almoxarife@hst.local` | `Almox@123` |

PINs dos colaboradores de exemplo: `1234` (Maria, Carlos, Ana) e `4321` (João).
A tela de login exibe essas credenciais quando
`NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true`.

## API REST

Todas as rotas (exceto login e health) exigem o cookie de sessão. Respostas de sucesso
usam o envelope `{ "ok": true, "data": ... }`.

### Autenticação

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login; define o cookie `hst_session`. |
| `POST` | `/api/auth/logout` | Encerra a sessão. |
| `GET` | `/api/auth/me` | Dados do usuário autenticado. |

### Colaboradores

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/colaboradores?q=&status=` | Lista/busca colaboradores. |
| `POST` | `/api/colaboradores` | Cria colaborador (PIN obrigatório). |
| `GET` | `/api/colaboradores/[id]` | Detalhe com histórico de entregas. |
| `PATCH` | `/api/colaboradores/[id]` | Atualiza dados (PIN vazio mantém o atual). |
| `DELETE` | `/api/colaboradores/[id]` | Arquiva (desliga) — **somente ADMIN**. |

### EPIs

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/epis?q=&incluirInativos=&estoqueBaixo=` | Lista/busca EPIs. |
| `POST` | `/api/epis` | Cria EPI (estoque inicial gera entrada). |
| `GET` | `/api/epis/[id]` | Detalhe com entregas e movimentações. |
| `PATCH` | `/api/epis/[id]` | Atualiza dados/estoque (ajuste auditado). |
| `DELETE` | `/api/epis/[id]` | Arquiva — **somente ADMIN**. |

### Entregas

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/entregas?status=&limit=&offset=` | Lista paginada. |
| `POST` | `/api/entregas` | Registra entrega (PIN ou assinatura). |
| `GET` | `/api/entregas/[id]` | Detalhe da entrega. |
| `POST` | `/api/entregas/[id]/devolucao` | Devolução; body opcional `{ "reintegrarEstoque": true }`. |

Exemplo de entrega:

```json
{
  "colaboradorId": "uuid",
  "epiId": "uuid",
  "quantidade": 1,
  "pin": "1234",
  "assinaturaDigital": "data:image/png;base64,..."
}
```

O campo `assinaturaDigital` é opcional quando o PIN é válido; o `pin` é opcional
quando há assinatura.

### Alertas

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/alertas/resumo` | Painel agregado (estoque, CA 90 dias, trocas 15 dias). |
| `GET` | `/api/alertas/estoque-baixo` | EPIs com saldo ≤ estoque mínimo. |
| `GET` | `/api/alertas/ca-vencimento?janela=30\|60\|90` | Vencidos e faixas 0–30, 31–60, 61–90 dias. |
| `GET` | `/api/alertas/trocas?dias=15` | Trocas próximas/atrasadas. |

### Saúde

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | `200` com banco ativo; `503` se indisponível. |

## Papéis e permissões

| Ação | ALMOXARIFE | ADMIN |
| --- | --- | --- |
| Login, leitura, criar/editar colaboradores e EPIs | ✅ | ✅ |
| Registrar entregas e devoluções, repor estoque | ✅ | ✅ |
| Arquivar/reativar EPI | ❌ | ✅ |
| Arquivar (desligar) colaborador / definir `DESLIGADO` | ❌ | ✅ |

A sessão é validada no layout autenticado **e** em cada Server Action / API Route —
o cliente nunca é a única barreira de autorização.

## Deploy

### Banco no Supabase

1. Crie o projeto e copie as duas strings de conexão.
2. `DATABASE_URL` → **Transaction Pooler** (porta `6543`, com `pgbouncer=true&connection_limit=1`).
3. `DIRECT_URL` → conexão direta (porta `5432`) usada por migrações.
4. Rode `npm run db:deploy` apontando para produção.

### Aplicação na Vercel

1. Importe o repositório.
2. Configure as variáveis do `.env.example` (principalmente `AUTH_SECRET`).
3. Build command: `npm run build` (já executa `prisma generate`).
4. Após o primeiro deploy, rode o seed uma única vez ou crie o usuário admin.

### Render / Railway

- Web Service com `npm run build` e `npm start`.
- Defina `PORT` conforme o provedor e as mesmas variáveis de ambiente.
- Use `/api/health` como health check.

## Segurança

- Senhas e PINs com bcrypt (custo 12); nunca há texto puro no banco nem em respostas.
- Cookies de sessão `httpOnly`, `sameSite=lax` e `secure` em produção.
- Rate limit de login por IP + e-mail (configurável por `AUTH_LOGIN_MAX_ATTEMPTS` e
  `AUTH_LOGIN_WINDOW_MINUTES`). Em cenário multi-instância, troque o armazenamento em
  memória por Redis/Upstash — a interface em `src/lib/rate-limit.ts` permanece a mesma.
- Validação de entrada com Zod em todas as rotas e Server Actions.
- Projeções `src/server/selects.ts` impedem vazamento de `pinHash`/`senhaHash`.
- Erros internos não expõem stack trace ao cliente.
- Exclusões são lógicas para preservar rastreabilidade de SST.

---

© HST — uso interno.
