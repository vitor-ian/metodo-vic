-- =============================================================================
-- Método VIC · diagnóstico visagista com painel de barbeiros
--
-- Quem é quem:
--   * admin    — o Max e a equipe. Vê e gerencia todos os barbeiros e todos os
--                diagnósticos.
--   * barbeiro — o barbeiro visagista. Configura o próprio link de formulário
--                e só enxerga os diagnósticos que chegaram por ele.
--   * cliente  — anônimo. Responde o formulário pelo link do barbeiro e envia
--                as fotos. Nunca lê nada: escreve só pelas funções públicas
--                (`enviar_diagnostico`, `registrar_arquivo`...) e sobe arquivo
--                no bucket, sempre com o token que gerou ao enviar.
--
-- Fotos: o token vai no caminho (<id>/<token>/...). Isso prova conhecimento do
-- token só na hora de CRIAR o arquivo — depois de criado, o caminho de qualquer
-- arquivo já contém o token certo. Por isso o cliente tem só INSERT no bucket;
-- ler, trocar e apagar é do barbeiro dono e do admin. Qual arquivo vale para
-- cada ângulo fica no mapa `diagnosticos.arquivos`, que o cliente atualiza pelas
-- funções com o token.
--
-- As funções auxiliares das políticas ficam no schema `privado`, que não é
-- exposto pela API: dá para usá-las no RLS sem virar endpoint.
-- =============================================================================

create schema if not exists privado;
grant usage on schema privado to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Perfis (um por usuário do Auth)
-- -----------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  papel text not null default 'barbeiro' check (papel in ('admin', 'barbeiro')),
  -- Conta nova nasce inativa: o admin aprova quem usa o sistema.
  ativo boolean not null default false,
  -- Primeira aprovação. Nulo = nunca aprovado (aguardando); com data e
  -- inativo = acesso desativado depois.
  aprovado_em timestamptz,
  nome text not null default '' check (char_length(nome) <= 120),
  email text not null default '',
  whatsapp text not null default '' check (char_length(whatsapp) <= 40),
  instagram text not null default '' check (char_length(instagram) <= 60),
  cidade text not null default '' check (char_length(cidade) <= 80),
  -- O link do formulário: /diagnostico/<slug>
  slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  form_ativo boolean not null default true,
  mensagem text not null default '' check (char_length(mensagem) <= 600),
  -- Formatos de atendimento que o barbeiro oferece (ids de diagAtendimento).
  atendimentos text[] not null default array[
    'pres-espaco', 'pres-casa', 'hibrida-casa', 'hibrida-espaco', 'online'
  ] check (atendimentos <@ array[
    'pres-espaco', 'pres-casa', 'hibrida-casa', 'hibrida-espaco', 'online'
  ]),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is 'Admins (Max e equipe) e barbeiros visagistas.';

-- -----------------------------------------------------------------------------
-- Diagnósticos (um por envio do formulário)
-- -----------------------------------------------------------------------------
create table public.diagnosticos (
  -- Gerados no aparelho do cliente: reenviar depois de uma falha de rede
  -- devolve o mesmo registro em vez de duplicar.
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  barbeiro_id uuid not null references public.perfis (id) on delete cascade,

  nome text not null check (char_length(nome) between 2 and 120),
  whatsapp text not null check (char_length(whatsapp) between 8 and 40),
  idioma text not null default 'pt-BR',
  data_diagnostico date not null default current_date,

  -- [{ "chave": "diag.e1", "resposta": "..." }, ...]
  escuta jsonb not null default '[]',
  -- Índice da alternativa escolhida em cada pergunta (0..3).
  respostas jsonb not null default '[]',
  -- { "D": 3, "I": 4, "S": 2, "C": 3 }
  placar jsonb not null default '{}',
  predominantes text[] not null default '{}',
  estilo text,
  atendimento text,

  -- Passos 2 e 3: fotos e referências.
  -- { "frente": "<id>/<token>/frente.lx2k.jpg", "referencia-ab12": "..." }
  arquivos jsonb not null default '{}',
  qtd_fotos smallint not null default 0,
  qtd_referencias smallint not null default 0,
  referencia_obs text not null default '' check (char_length(referencia_obs) <= 1000),
  fotos_enviadas_em timestamptz,
  envio_concluido_em timestamptz,

  -- Gestão pelo barbeiro.
  status text not null default 'novo'
    check (status in ('novo', 'em_contato', 'agendado', 'concluido', 'arquivado')),
  notas text not null default '' check (char_length(notas) <= 5000),

  origem jsonb not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index diagnosticos_barbeiro_idx on public.diagnosticos (barbeiro_id, criado_em desc);
create index diagnosticos_status_idx on public.diagnosticos (status);

comment on column public.diagnosticos.token is
  'Segredo do cliente: autoriza o envio das fotos para a pasta <id>/<token>/ do bucket.';

-- -----------------------------------------------------------------------------
-- Funções auxiliares (privadas)
-- -----------------------------------------------------------------------------
create or replace function privado.eh_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin' and ativo
  )
$$;

create or replace function privado.usuario_ativo()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo)
$$;

/** O cliente, com o token, pode subir arquivos para o próprio diagnóstico por 30 dias. */
create or replace function privado.pode_enviar_arquivo(p_id text, p_token text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.diagnosticos d
    where d.id::text = p_id
      and d.token::text = p_token
      and d.criado_em > now() - interval '30 days'
  )
$$;

/**
 * Upload do cliente: nome no padrão do front
 * (<id>/<token>/<chave>.<marca>.<ext>), token válido e no máximo 40 arquivos
 * na pasta — o bastante para trocar as fotos algumas vezes, sem virar depósito.
 */
create or replace function privado.pode_subir_arquivo(p_nome text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    p_nome ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[a-z0-9-]{1,40}\.[a-z0-9]{1,16}\.(jpg|jpeg|png|webp|heic|heif)$'
    and privado.pode_enviar_arquivo(split_part(p_nome, '/', 1), split_part(p_nome, '/', 2))
    and (
      select count(*) from storage.objects o
      where o.bucket_id = 'diagnosticos'
        and o.name like split_part(p_nome, '/', 1) || '/' || split_part(p_nome, '/', 2) || '/%'
    ) < 40
$$;

/** O dono do diagnóstico (ou um admin) gerencia os arquivos dele. */
create or replace function privado.pode_gerir_diagnostico(p_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select privado.eh_admin() or exists (
    select 1 from public.diagnosticos d
    where d.id::text = p_id
      and d.barbeiro_id = auth.uid()
      and privado.usuario_ativo()
  )
$$;

-- -----------------------------------------------------------------------------
-- Gatilhos
-- -----------------------------------------------------------------------------
create or replace function privado.tocar_atualizado_em()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function privado.tocar_atualizado_em();
create trigger diagnosticos_atualizado_em before update on public.diagnosticos
  for each row execute function privado.tocar_atualizado_em();

/** Todo usuário novo do Auth ganha um perfil de barbeiro inativo. */
create or replace function privado.criar_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfis (id, email, nome, whatsapp)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'nome', ''), 120),
    left(coalesce(new.raw_user_meta_data ->> 'whatsapp', ''), 40)
  );
  return new;
end
$$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function privado.criar_perfil();

/** E-mail trocado no Auth acompanha no perfil. */
create or replace function privado.sincronizar_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.perfis set email = coalesce(new.email, '') where id = new.id;
  return new;
end
$$;

create trigger ao_trocar_email after update of email on auth.users
  for each row execute function privado.sincronizar_email();

/**
 * Barbeiro edita o próprio perfil, mas papel, aprovação e e-mail são do admin.
 * Sem usuário na sessão (SQL editor, service role) passa direto: é assim que
 * o primeiro admin é promovido.
 */
create or replace function privado.proteger_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not privado.eh_admin() then
    new.papel := old.papel;
    new.ativo := old.ativo;
    new.email := old.email;
    new.aprovado_em := old.aprovado_em;
  end if;
  -- Ninguém se rebaixa nem se desativa sozinho: evita ficar sem admin.
  if auth.uid() = old.id then
    new.papel := old.papel;
    new.ativo := old.ativo;
  end if;
  if new.ativo and new.aprovado_em is null then
    new.aprovado_em := now();
  end if;
  return new;
end
$$;

create trigger perfis_proteger before update on public.perfis
  for each row execute function privado.proteger_perfil();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.diagnosticos enable row level security;

create policy "perfis: ver o próprio ou admin" on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or (select privado.eh_admin()));

create policy "perfis: editar o próprio ou admin" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()) or (select privado.eh_admin()))
  with check (id = (select auth.uid()) or (select privado.eh_admin()));

create policy "diagnosticos: dono ativo ou admin lê" on public.diagnosticos
  for select to authenticated
  using (
    (barbeiro_id = (select auth.uid()) and (select privado.usuario_ativo()))
    or (select privado.eh_admin())
  );

create policy "diagnosticos: dono ativo ou admin edita" on public.diagnosticos
  for update to authenticated
  using (
    (barbeiro_id = (select auth.uid()) and (select privado.usuario_ativo()))
    or (select privado.eh_admin())
  )
  with check (
    (barbeiro_id = (select auth.uid()) and (select privado.usuario_ativo()))
    or (select privado.eh_admin())
  );

create policy "diagnosticos: dono ativo ou admin apaga" on public.diagnosticos
  for delete to authenticated
  using (
    (barbeiro_id = (select auth.uid()) and (select privado.usuario_ativo()))
    or (select privado.eh_admin())
  );

-- Sem política de insert: o cliente grava só por enviar_diagnostico().

-- -----------------------------------------------------------------------------
-- API pública do formulário (anon)
-- -----------------------------------------------------------------------------

/** Dados do barbeiro que o formulário mostra. Nulo se o link não existe ou está pausado. */
create or replace function public.formulario_publico(p_slug text)
returns json
language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'nome', p.nome,
    'cidade', p.cidade,
    'instagram', p.instagram,
    'whatsapp', p.whatsapp,
    'mensagem', p.mensagem,
    'atendimentos', p.atendimentos
  )
  from public.perfis p
  where p.slug = lower(p_slug) and p.ativo and p.form_ativo
$$;

/**
 * Formato do que o formulário manda. O cliente é anônimo: tudo é conferido
 * (tipos, tamanhos e os valores que existem no front).
 */
create or replace function privado.payload_valido(p jsonb)
returns boolean
language plpgsql immutable set search_path = ''
as $$
begin
  if jsonb_typeof(p) <> 'object' or octet_length(p::text) > 60000 then
    return false;
  end if;

  -- Escuta: até 20 respostas { chave: 'diag.eN', resposta: texto curto }.
  if jsonb_typeof(coalesce(p -> 'escuta', '[]')) <> 'array'
     or jsonb_array_length(coalesce(p -> 'escuta', '[]')) > 20
     or exists (
       select 1 from jsonb_array_elements(coalesce(p -> 'escuta', '[]')) e
       where jsonb_typeof(e) <> 'object'
          or coalesce(e ->> 'chave', '') !~ '^diag\.e[0-9]{1,2}$'
          or char_length(coalesce(e ->> 'resposta', '')) > 3000
     ) then
    return false;
  end if;

  -- Questionário: até 30 respostas, cada uma 0..3 ou vazia.
  if jsonb_typeof(coalesce(p -> 'respostas', '[]')) <> 'array'
     or jsonb_array_length(coalesce(p -> 'respostas', '[]')) > 30
     or exists (
       select 1 from jsonb_array_elements(coalesce(p -> 'respostas', '[]')) r
       where r <> 'null'::jsonb and not (r in ('0', '1', '2', '3'))
     ) then
    return false;
  end if;

  -- Placar: só D, I, S, C com inteiros de 0 a 30.
  if jsonb_typeof(coalesce(p -> 'placar', '{}')) <> 'object'
     or exists (
       select 1 from jsonb_each(coalesce(p -> 'placar', '{}')) k
       where k.key not in ('D', 'I', 'S', 'C')
          or jsonb_typeof(k.value) <> 'number'
          or (k.value)::text !~ '^[0-9]{1,2}$'
          or (k.value)::text::int > 30
     ) then
    return false;
  end if;

  if jsonb_typeof(coalesce(p -> 'predominantes', '[]')) <> 'array'
     or exists (
       select 1 from jsonb_array_elements_text(coalesce(p -> 'predominantes', '[]')) x
       where x not in ('D', 'I', 'S', 'C')
     ) then
    return false;
  end if;

  if coalesce(p ->> 'idioma', 'pt-BR') not in ('pt-BR', 'en-US', 'es')
     or coalesce(p ->> 'estilo', 'natural') not in (
       'natural', 'tradicional', 'elegante', 'criativo', 'romantico', 'sexy', 'dramatico'
     )
     or coalesce(p ->> 'atendimento', 'online') not in (
       'pres-espaco', 'pres-casa', 'hibrida-casa', 'hibrida-espaco', 'online'
     ) then
    return false;
  end if;

  return true;
end
$$;

/**
 * Grava o diagnóstico respondido. `id` e `token` vêm do aparelho do cliente,
 * o que torna o reenvio idempotente: se a primeira tentativa gravou e só a
 * resposta se perdeu, a segunda devolve o mesmo registro.
 */
create or replace function public.enviar_diagnostico(p_slug text, p_dados jsonb)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  v_barbeiro uuid;
  v_id uuid := (p_dados ->> 'id')::uuid;
  v_token uuid := (p_dados ->> 'token')::uuid;
  v_nome text := btrim(coalesce(p_dados ->> 'nome', ''));
  v_whatsapp text := btrim(coalesce(p_dados ->> 'whatsapp', ''));
begin
  select id into v_barbeiro
  from public.perfis
  where slug = lower(p_slug) and ativo and form_ativo;

  if v_barbeiro is null then
    raise exception 'formulario_indisponivel' using errcode = 'P0002';
  end if;

  if v_id is null or v_token is null then
    raise exception 'identificador_invalido' using errcode = '22023';
  end if;

  if not privado.payload_valido(p_dados) then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  -- Freio contra robô: o formulário é público. Um reenvio do mesmo id não
  -- conta (é a mesma resposta voltando depois de uma falha de rede).
  if not exists (select 1 from public.diagnosticos where id = v_id) and (
    (select count(*) from public.diagnosticos
      where barbeiro_id = v_barbeiro and criado_em > now() - interval '10 minutes') >= 20
    or (select count(*) from public.diagnosticos
      where criado_em > now() - interval '10 minutes') >= 200
  ) then
    raise exception 'muitos_envios' using errcode = '54000';
  end if;

  insert into public.diagnosticos (
    id, token, barbeiro_id, nome, whatsapp, idioma, data_diagnostico,
    escuta, respostas, placar, predominantes, estilo, atendimento, origem
  ) values (
    v_id,
    v_token,
    v_barbeiro,
    left(v_nome, 120),
    left(v_whatsapp, 40),
    coalesce(p_dados ->> 'idioma', 'pt-BR'),
    -- A data vem do aparelho (fuso do cliente), mas não pode ser qualquer uma.
    case
      when (p_dados ->> 'data') ~ '^\d{4}-\d{2}-\d{2}$'
       and (p_dados ->> 'data')::date between current_date - 2 and current_date + 2
      then (p_dados ->> 'data')::date
      else current_date
    end,
    coalesce(p_dados -> 'escuta', '[]'),
    coalesce(p_dados -> 'respostas', '[]'),
    coalesce(p_dados -> 'placar', '{}'),
    coalesce(
      array(select jsonb_array_elements_text(p_dados -> 'predominantes')),
      '{}'
    ),
    p_dados ->> 'estilo',
    p_dados ->> 'atendimento',
    case
      when jsonb_typeof(p_dados -> 'origem') = 'object'
       and octet_length((p_dados -> 'origem')::text) <= 1000
      then p_dados -> 'origem'
      else '{}'
    end
  )
  on conflict (id) do nothing;

  if not exists (
    select 1 from public.diagnosticos where id = v_id and token = v_token
  ) then
    raise exception 'identificador_invalido' using errcode = '22023';
  end if;

  return json_build_object('id', v_id);
end
$$;

/** Ângulos do passo 2 (os ids de diagAngulos no front). */
create or replace function privado.angulos()
returns text[]
language sql immutable set search_path = ''
as $$
  select array['frente', 'perfil-direito', 'perfil-esquerdo', '45-esquerdo', '45-direito', 'costas']
$$;

/**
 * Quem pode mexer no mapa de arquivos: o cliente com o token, ou o barbeiro
 * dono / admin pelo painel (aí o token vem nulo).
 */
create or replace function privado.pode_editar_envio(p_id uuid, p_token uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    (p_token is not null and privado.pode_enviar_arquivo(p_id::text, p_token::text))
    or privado.pode_gerir_diagnostico(p_id::text)
$$;

/** Contagens da lista do painel, tiradas do mapa de arquivos. */
create or replace function privado.atualizar_contagem(p_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.diagnosticos d set
    qtd_fotos = (
      select count(*) from jsonb_object_keys(d.arquivos) k
      where k = any (privado.angulos())
    ),
    qtd_referencias = (
      select count(*) from jsonb_object_keys(d.arquivos) k
      where k like 'referencia-%'
    )
  where d.id = p_id
$$;

/**
 * Registra o arquivo que vale para uma chave (um ângulo ou `referencia-<x>`).
 * O arquivo precisa já estar no bucket, dentro da pasta do diagnóstico.
 * Devolve o caminho que ele substituiu, se havia (o painel apaga o antigo).
 */
create or replace function public.registrar_arquivo(
  p_id uuid,
  p_token uuid,
  p_chave text,
  p_caminho text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_diag public.diagnosticos;
  v_anterior text;
begin
  if not privado.pode_editar_envio(p_id, p_token) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  select * into v_diag from public.diagnosticos where id = p_id;

  if not (p_chave = any (privado.angulos()) or p_chave ~ '^referencia-[a-z0-9]{1,24}$') then
    raise exception 'chave_invalida' using errcode = '22023';
  end if;

  if not starts_with(p_caminho, v_diag.id::text || '/' || v_diag.token::text || '/')
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'diagnosticos' and name = p_caminho
     ) then
    raise exception 'arquivo_invalido' using errcode = '22023';
  end if;

  if p_chave like 'referencia-%'
     and not v_diag.arquivos ? p_chave
     and (select count(*) from jsonb_object_keys(v_diag.arquivos) k
          where k like 'referencia-%') >= 6 then
    raise exception 'limite_referencias' using errcode = '22023';
  end if;

  v_anterior := v_diag.arquivos ->> p_chave;
  update public.diagnosticos
  set arquivos = arquivos || jsonb_build_object(p_chave, p_caminho)
  where id = p_id;
  perform privado.atualizar_contagem(p_id);
  return v_anterior;
end
$$;

/** Tira uma chave do mapa. Devolve o caminho que estava nela. */
create or replace function public.remover_arquivo(p_id uuid, p_token uuid, p_chave text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_anterior text;
begin
  if not privado.pode_editar_envio(p_id, p_token) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  select arquivos ->> p_chave into v_anterior from public.diagnosticos where id = p_id;
  update public.diagnosticos set arquivos = arquivos - p_chave where id = p_id;
  perform privado.atualizar_contagem(p_id);
  return v_anterior;
end
$$;

/** O cliente, ao voltar pelo mesmo link, recupera quais ângulos já mandou. */
create or replace function public.arquivos_do_envio(p_id uuid, p_token uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select d.arquivos from public.diagnosticos d
  where privado.pode_enviar_arquivo(p_id::text, p_token::text) and d.id = p_id
$$;

/**
 * O cliente fecha uma etapa do envio: 'fotos' (passo 2) ou 'referencias'
 * (passo 3, com o comentário opcional sobre a referência).
 */
create or replace function public.finalizar_envio(
  p_id uuid,
  p_token uuid,
  p_etapa text,
  p_obs text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not privado.pode_enviar_arquivo(p_id::text, p_token::text) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  if p_etapa = 'fotos' then
    update public.diagnosticos
    set fotos_enviadas_em = coalesce(fotos_enviadas_em, now())
    where id = p_id;
  elsif p_etapa = 'referencias' then
    update public.diagnosticos
    set envio_concluido_em = coalesce(envio_concluido_em, now()),
        referencia_obs = left(coalesce(p_obs, referencia_obs), 1000)
    where id = p_id;
  else
    raise exception 'etapa_invalida' using errcode = '22023';
  end if;
end
$$;

/** Números do topo do painel. Respeita o RLS de quem chama. */
create or replace function public.painel_resumo(p_barbeiro uuid default null)
returns json
language sql stable security invoker set search_path = ''
as $$
  select json_build_object(
    'total', count(*) filter (where status <> 'arquivado'),
    'novos', count(*) filter (where status = 'novo'),
    'semana', count(*) filter (where criado_em > now() - interval '7 days'),
    'sem_fotos', count(*) filter (where fotos_enviadas_em is null and status <> 'arquivado'),
    'agendados', count(*) filter (where status = 'agendado'),
    'concluidos', count(*) filter (where status = 'concluido')
  )
  from public.diagnosticos
  where p_barbeiro is null or barbeiro_id = p_barbeiro
$$;

-- Funções do painel: só para quem está logado. (O execute vem por PUBLIC
-- por padrão, então revogar só de anon não bastaria.)
revoke execute on function public.painel_resumo(uuid) from public, anon;
grant execute on function public.painel_resumo(uuid) to authenticated;
grant execute on function public.formulario_publico(text) to anon, authenticated;
grant execute on function public.enviar_diagnostico(text, jsonb) to anon, authenticated;
grant execute on function public.finalizar_envio(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.registrar_arquivo(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.remover_arquivo(uuid, uuid, text) to anon, authenticated;
grant execute on function public.arquivos_do_envio(uuid, uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: fotos e referências
--   diagnosticos/<id>/<token>/frente.<marca>.jpg
--   diagnosticos/<id>/<token>/referencia-<x>.jpg
-- Cada envio tem nome novo (o cliente não sobrescreve). Os arquivos trocados
-- pelo cliente ficam órfãos na pasta até o diagnóstico ser apagado.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diagnosticos',
  'diagnosticos',
  false,
  12582912, -- 12 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Só INSERT (ver o cabeçalho): select/update/delete com o token no caminho
-- liberariam a pasta de todo mundo.
create policy "diagnosticos: cliente envia para a própria pasta" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'diagnosticos' and privado.pode_subir_arquivo(name));

create policy "diagnosticos: barbeiro e admin gerenciam" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'diagnosticos'
    and privado.pode_gerir_diagnostico((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'diagnosticos'
    and privado.pode_gerir_diagnostico((storage.foldername(name))[1])
  );

-- -----------------------------------------------------------------------------
-- Privilégios
--
-- O Supabase dá ALL (inclusive TRUNCATE, que o RLS não cobre) em toda tabela
-- nova do public para anon e authenticated. Aqui fica só o necessário:
--   * anon: nada nas tabelas (o formulário usa as funções).
--   * authenticated: ler (o RLS filtra) e editar só as colunas de gestão.
--     O token, as respostas e o mapa de arquivos do cliente não mudam pelo
--     painel.
-- -----------------------------------------------------------------------------
revoke all on public.perfis, public.diagnosticos from anon, authenticated, public;

grant select on public.perfis to authenticated;
grant update (
  nome, whatsapp, instagram, cidade, slug, form_ativo, mensagem, atendimentos,
  papel, ativo -- só admin muda de fato: ver privado.proteger_perfil
) on public.perfis to authenticated;

grant select, delete on public.diagnosticos to authenticated;
grant update (status, notas, barbeiro_id) on public.diagnosticos to authenticated;

-- Funções privadas: só as que o RLS chama precisam de execute para quem
-- consulta. As demais rodam por dentro das funções security definer.
revoke execute on all functions in schema privado from public, anon, authenticated;
grant execute on function
  privado.eh_admin(),
  privado.usuario_ativo(),
  privado.pode_gerir_diagnostico(text),
  privado.pode_subir_arquivo(text)
to anon, authenticated;
