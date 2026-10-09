# Método VIC — diagnóstico visagista

Formulário de diagnóstico do Método VIC (o mesmo roteiro do site do Max:
escuta ativa, perfil comportamental, estilo desejado) com envio de fotos, e um
painel para o Max/equipe (admin) e para os barbeiros visagistas.

## Como funciona

| Quem                 | Onde                              | O que faz                                                                                                                                      |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Cliente              | `/diagnostico/<link-do-barbeiro>` | Passo 1: diagnóstico e resultado. Passo 2: as 6 fotos (frente, perfis, 45°, costas). Passo 3: referências (opcional).                          |
| Barbeiro             | `/painel`                         | Vê e gerencia só os diagnósticos que chegaram pelo link dele: fotos, status, anotações, PDF, WhatsApp. Configura o link em **Meu formulário**. |
| Admin (Max e equipe) | `/painel`                         | Vê todos os diagnósticos e todos os barbeiros; aprova, desativa, promove a admin, edita links e transfere diagnósticos.                        |

Formulário, login e painel funcionam em português, inglês e espanhol (seletor
de idioma no topo do formulário/login e no menu do painel). Os textos ficam em
`src/i18n/<idioma>/index.js`.

Barbeiro novo se cadastra em `/cadastro` e fica **aguardando aprovação** até um
admin liberar em **Barbeiros**.

## Instalar

```bash
npm install
cp .env.example .env   # preencha com o projeto Supabase
npm run dev
```

## Supabase (projeto `metodo-vic`, ref `bfwzmkrdyngmmgiwbzcs`)

A migration de `supabase/migrations/` já está aplicada e há um admin
(`vitor.ian@nairo.com.br`). Para promover outra conta a admin pelo SQL Editor:

```sql
update public.perfis set papel = 'admin', ativo = true where email = '...';
```

Depois disso, os admins aprovam e promovem pelo painel (**Barbeiros**).

Ajustes que só existem no dashboard (**Authentication**):

- **URL Configuration** → Site URL = `https://metodo-vic.pages.dev`;
  Redirect URLs = `https://metodo-vic.pages.dev/entrar`,
  `https://metodo-vic.pages.dev/redefinir-senha` e, para desenvolvimento,
  `http://localhost:9000/**`.
- **Providers → Email**: manter "Confirm email" ligado; senha mínima 8;
  ligar "Secure password change".
- **Attack Protection**: ligar "Leaked password protection".
- **SMTP**: configurar um SMTP próprio (o padrão do Supabase manda poucos
  e-mails por hora).

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist/spa`
- Variáveis (Production e Preview): `QCLI_SUPABASE_URL`, `QCLI_SUPABASE_KEY`,
  `QCLI_SITE_URL=https://metodo-vic.pages.dev` e `NODE_VERSION=22`. As `QCLI_` entram no bundle na hora do
  build: mudou alguma, faça um novo deploy.
- `public/_redirects` manda toda rota para o `index.html` (rotas em modo
  history) e `public/_headers` aplica os cabeçalhos de segurança. A CSP do
  `_headers` fixa o host do Supabase: trocou de projeto, atualize lá.

## Segurança, em resumo

- O cliente é anônimo e **nunca lê** nada: grava pelas funções
  `enviar_diagnostico`, `registrar_arquivo` e `finalizar_envio`, com um token
  gerado no aparelho dele. Tudo o que ele manda é validado no banco (formato,
  tamanhos, valores) e há limite de envios por link (20 a cada 10 min).
- No bucket (privado) o cliente só **cria** arquivos na pasta `<id>/<token>/`,
  com nome e extensão conferidos e no máximo 40 por pasta. Ler, trocar e apagar
  é só do barbeiro dono e dos admins, por URL assinada de 1 hora.
- Tabelas: anon não tem acesso nenhum; logado lê o que o RLS deixa e edita só
  as colunas de gestão (status, anotações, dados do perfil). Respostas do
  cliente e tokens não mudam pelo painel.
- Barbeiro desativado perde o acesso aos diagnósticos e o link dele para de
  receber respostas. Ninguém se rebaixa nem se desativa sozinho.
