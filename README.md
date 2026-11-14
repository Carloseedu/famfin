# FamFin — Sistema de Gestão Financeira Familiar

Aplicação web completa para controle financeiro familiar: receitas, despesas,
cartões de crédito, orçamentos, metas e relatórios — compartilhada entre os
integrantes da família, com dados seguros e isolados por família.

## 🚀 Deploy rápido (15 minutos)

### Pré-requisitos
- Conta no [Supabase](https://supabase.com) (grátis) — banco de dados
- Conta no [GitHub](https://github.com) (grátis) — código-fonte
- Conta na [Vercel](https://vercel.com) (grátis) — hospedagem

### Passo 1: Configurar o banco (Supabase)

1. Acesse https://supabase.com e crie uma conta
2. Clique em **New project**
   - Name: `famfin`
   - Database Password: crie uma senha forte e guarde
   - Region: South America (São Paulo)
   - Pricing plan: Free
3. Aguarde ~2 min até o status ficar "Active"
4. Vá em **Project Settings** (⚙️) → **Database**
5. Em **Connection string**, copie a **URI**
   (formato: `postgresql://postgres.XXX:YYY@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`)

### Passo 2: Criar tabelas no banco

Você tem duas opções:

**Opção A (mais simples): pelo SQL Editor do Supabase**
1. No painel do Supabase, vá em **SQL Editor** → **New query**
2. Abra o arquivo `famfin-create-tables.sql` (que acompanha este projeto)
3. Copie todo o conteúdo e cole no SQL Editor
4. Clique em **Run** — pronto, as 13 tabelas estão criadas

**Opção B: pela linha de comando (se tiver Node.js instalado)**
```bash
npm install
npx prisma db push
```

### Passo 3: Subir o código para o GitHub

1. Acesse https://github.com e crie conta
2. Clique no ícone **+** no canto superior direito → **New repository**
3. Preencha:
   - Repository name: `famfin`
   - Description: `Sistema de gestão financeira familiar`
   - Marque **Public** (ou Private, se preferir)
   - **NÃO** marque "Add a README" (já tem um)
   - Clique em **Create repository**
4. Na página do repositório, clique em **"uploading an existing file"**
   (link no meio da página)
5. Arraste **todos os arquivos do projeto** (exceto as pastas `node_modules/`,
   `.next/`, `db/`, `.zscripts/`) para a área de upload
6. Em "Commit changes", escreva: `Projeto inicial do FamFin`
7. Clique em **Commit changes**

### Passo 4: Publicar na Vercel

1. Acesse https://vercel.com e clique em **Sign Up**
2. Escolha **Continue with GitHub** (use a mesma conta do GitHub)
3. Autorize a Vercel a acessar seus repositórios
4. No painel, clique em **Add New** → **Project**
5. Clique em **Import** ao lado do repositório `famfin`
6. **IMPORTANTE — antes de clicar em Deploy:**
   - Role até a seção **Environment Variables**
   - Adicione:
     - Key: `DATABASE_URL`
     - Value: cole a URI do Supabase (passo 1)
     - Environment: marque os três (Production, Preview, Development)
7. Clique em **Deploy** e aguarde ~2 minutos
8. Quando terminar, você verá a URL: `https://famfin.vercel.app` 🎉

### Passo 5: Criar tabelas no banco

Após o deploy, você precisa criar as tabelas no banco. Há duas formas:

**Forma A (recomendada):** na Vercel, vá em seu projeto → **Storage** → conecte
o Supabase como integração. A Vercel roda `prisma db push` automaticamente.

**Forma B (manual):** instale o Node.js + Git na sua máquina, clone o repositório,
crie um arquivo `.env` com a `DATABASE_URL` do Supabase, e rode:
```bash
npm install
npx prisma db push
```

### Passo 6: Testar o app

Acesse sua URL na Vercel. Para criar uma conta demo:

1. Clique em **Criar conta**
2. Preencha: nome da família, seu nome, e-mail, senha
3. Você vira administrador automaticamente
4. Convide outros integrantes pelo módulo "Integrantes"

## 📁 Estrutura do projeto

```
famfin/
├── prisma/schema.prisma    → Estrutura do banco de dados (13 modelos)
├── src/
│   ├── app/                → Páginas e APIs (Next.js App Router)
│   ├── components/         → Componentes React reutilizáveis
│   ├── lib/                → Funções utilitárias (auth, db, format)
│   └── hooks/              → Hooks do React
├── public/                 → Imagens e ícones
├── package.json            → Dependências e scripts
└── README.md               → Este arquivo
```

## 🛠️ Desenvolvimento local

```bash
npm install          # instalar dependências
npm run dev          # iniciar em http://localhost:3000
npm run lint         # verificar qualidade do código
npm run db:push      # criar/atualizar tabelas no banco
```

## 🏗️ Stack tecnológica

- **Framework:** Next.js 16 com App Router
- **Linguagem:** TypeScript 5
- **Estilo:** Tailwind CSS 4 + shadcn/ui
- **Banco:** PostgreSQL via Prisma ORM
- **Gráficos:** Recharts
- **Estado:** Zustand + React Query
- **Validação:** Zod

## 🔒 Segurança

- Senhas hasheadas com PBKDF2-SHA512 (100.000 iterações)
- Sessões em cookies httpOnly
- Isolamento por `familyId` em todas as queries (uma família nunca acessa dados de outra)
- Validação de entrada com Zod em todas as APIs
- Auditoria de operações importantes

## 📞 Suporte

Para dúvidas sobre deploy ou personalização, consulte a documentação:
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
