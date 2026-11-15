-- =============================================================================
-- Método VIC · avaliação pós-atendimento
--
-- O barbeiro manda um segundo link, separado do diagnóstico, depois que o
-- atendimento acontece: /avaliacao/<slug>. Pela ficha do diagnóstico o link
-- vai com `?d=<id do diagnóstico>`, o que liga a avaliação ao cliente (e
-- impede que o mesmo diagnóstico seja avaliado duas vezes).
--
-- O formulário tem três perguntas fixas — nota geral (1 a 5 estrelas),
-- recomendação (0 a 10, o NPS) e um comentário — e até 10 perguntas que o
-- barbeiro cria no painel (`perfis.avaliacao_perguntas`).
--
-- Mesmo modelo de segurança do diagnóstico: o cliente é anônimo e só escreve
-- por `enviar_avaliacao`; quem lê é o barbeiro dono e os admins.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuração no perfil do barbeiro
-- -----------------------------------------------------------------------------
alter table public.perfis
  add column avaliacao_ativa boolean not null default true,
  -- [{ "id": "a1b2", "texto": "O resultado ficou como você esperava?", "tipo": "sim_nao" }]
  -- tipo: 'nota' (1 a 5 estrelas) | 'sim_nao' | 'texto'
  add column avaliacao_perguntas jsonb not null default '[]';

/** Até 10 perguntas, com id único, texto de 3 a 200 caracteres e tipo conhecido. */
create or replace function privado.validar_perguntas()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if jsonb_typeof(new.avaliacao_perguntas) <> 'array'
     or jsonb_array_length(new.avaliacao_perguntas) > 10
     or exists (
       select 1 from jsonb_array_elements(new.avaliacao_perguntas) q
       where jsonb_typeof(q) <> 'object'
          or coalesce(q ->> 'id', '') !~ '^[a-z0-9]{1,24}$'
          or char_length(btrim(coalesce(q ->> 'texto', ''))) not between 3 and 200
          or coalesce(q ->> 'tipo', '') not in ('nota', 'sim_nao', 'texto')
     )
     or (
       select count(distinct q ->> 'id')
       from jsonb_array_elements(new.avaliacao_perguntas) q
     ) <> jsonb_array_length(new.avaliacao_perguntas)
  then
    raise exception 'perguntas_invalidas' using errcode = '22023';
  end if;
  return new;
end
$$;

create trigger perfis_validar_perguntas
  before insert or update of avaliacao_perguntas on public.perfis
  for each row execute function privado.validar_perguntas();

-- -----------------------------------------------------------------------------
-- Avaliações (uma por envio)
-- -----------------------------------------------------------------------------
create table public.avaliacoes (
  -- Gerado no aparelho do cliente: reenviar depois de uma falha de rede não
  -- duplica.
  id uuid primary key,
  barbeiro_id uuid not null references public.perfis (id) on delete cascade,
  -- Preenchido quando o link veio da ficha do diagnóstico.
  diagnostico_id uuid references public.diagnosticos (id) on delete set null,

  nome text not null default '' check (char_length(nome) <= 120),
  nota smallint not null check (nota between 1 and 5),
  nps smallint check (nps between 0 and 10),
  comentario text not null default '' check (char_length(comentario) <= 2000),
  -- Cópia da pergunta junto com a resposta: o barbeiro pode editar ou apagar
  -- a pergunta depois sem perder o que já foi respondido.
  -- [{ "id", "texto", "tipo", "resposta": 4 | true | "..." }]
  respostas jsonb not null default '[]',
  idioma text not null default 'pt-BR',
  criado_em timestamptz not null default now()
);

create index avaliacoes_barbeiro_idx on public.avaliacoes (barbeiro_id, criado_em desc);
create unique index avaliacoes_diagnostico_idx on public.avaliacoes (diagnostico_id)
  where diagnostico_id is not null;

comment on table public.avaliacoes is 'Avaliações pós-atendimento enviadas pelos clientes.';

alter table public.avaliacoes enable row level security;

create policy "avaliacoes: dono ativo ou admin lê" on public.avaliacoes
  for select to authenticated
  using (
    (barbeiro_id = (select auth.uid()) and (select privado.usuario_ativo()))
    or (select privado.eh_admin())
  );

-- Apagar serve para tirar teste e spam da média.
create policy "avaliacoes: dono ativo ou admin apaga" on public.avaliacoes
  for delete to authenticated
  using (
    (barbeiro_id = (select auth.uid()) and (select privado.usuario_ativo()))
    or (select privado.eh_admin())
  );

-- Sem insert nem update: o cliente grava só por enviar_avaliacao().

-- -----------------------------------------------------------------------------
-- API pública da avaliação (anon)
-- -----------------------------------------------------------------------------

/**
 * O que a página de avaliação mostra. Nulo se o link não existe ou a avaliação
 * está pausada. Com o id do diagnóstico, devolve o primeiro nome do cliente e
 * se ele já avaliou.
 */
create or replace function public.avaliacao_publica(p_slug text, p_diagnostico uuid default null)
returns json
language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'nome', p.nome,
    'instagram', p.instagram,
    'perguntas', p.avaliacao_perguntas,
    'cliente', (
      select split_part(btrim(d.nome), ' ', 1)
      from public.diagnosticos d
      where d.id = p_diagnostico and d.barbeiro_id = p.id
    ),
    'avaliado', p_diagnostico is not null and exists (
      select 1 from public.avaliacoes a where a.diagnostico_id = p_diagnostico
    )
  )
  from public.perfis p
  where p.slug = lower(p_slug) and p.ativo and p.avaliacao_ativa
$$;

/**
 * Grava a avaliação. As respostas das perguntas do barbeiro chegam como
 * { "<id da pergunta>": valor }; só entram as perguntas que existem agora,
 * conferidas pelo tipo.
 */
create or replace function public.enviar_avaliacao(p_slug text, p_dados jsonb)
returns json
language plpgsql security definer set search_path = ''
as $$
declare
  v_barbeiro public.perfis;
  v_id uuid;
  v_diag uuid;
  v_nome text := '';
  v_respostas jsonb := '[]';
  v_pergunta jsonb;
  v_resp jsonb;
begin
  select * into v_barbeiro
  from public.perfis
  where slug = lower(p_slug) and ativo and avaliacao_ativa;

  if v_barbeiro.id is null then
    raise exception 'avaliacao_indisponivel' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_dados) is distinct from 'object' or octet_length(p_dados::text) > 20000 then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  begin
    v_id := (p_dados ->> 'id')::uuid;
    v_diag := nullif(p_dados ->> 'diagnostico', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'identificador_invalido' using errcode = '22023';
  end;

  if v_id is null then
    raise exception 'identificador_invalido' using errcode = '22023';
  end if;

  if coalesce(p_dados ->> 'nota', '') !~ '^[1-5]$'
     or (p_dados ? 'nps' and jsonb_typeof(p_dados -> 'nps') <> 'null'
         and coalesce(p_dados ->> 'nps', '') !~ '^([0-9]|10)$')
     or (p_dados ? 'comentario' and jsonb_typeof(p_dados -> 'comentario') not in ('string', 'null'))
     or (p_dados ? 'nome' and jsonb_typeof(p_dados -> 'nome') not in ('string', 'null'))
     or (p_dados ? 'respostas' and jsonb_typeof(p_dados -> 'respostas') not in ('object', 'null'))
  then
    raise exception 'dados_invalidos' using errcode = '22023';
  end if;

  -- O diagnóstico precisa ser deste barbeiro; se não for, a avaliação entra
  -- avulsa (o link pode ter sido copiado de outra ficha).
  if v_diag is not null then
    select btrim(d.nome) into v_nome
    from public.diagnosticos d
    where d.id = v_diag and d.barbeiro_id = v_barbeiro.id;
    if not found then
      v_diag := null;
      v_nome := '';
    end if;
  end if;

  for v_pergunta in select * from jsonb_array_elements(v_barbeiro.avaliacao_perguntas) loop
    v_resp := p_dados -> 'respostas' -> (v_pergunta ->> 'id');
    if v_resp is null or jsonb_typeof(v_resp) = 'null' then
      continue;
    end if;

    if v_pergunta ->> 'tipo' = 'nota' then
      if jsonb_typeof(v_resp) <> 'number' or v_resp::text !~ '^[1-5]$' then
        raise exception 'dados_invalidos' using errcode = '22023';
      end if;
    elsif v_pergunta ->> 'tipo' = 'sim_nao' then
      if jsonb_typeof(v_resp) <> 'boolean' then
        raise exception 'dados_invalidos' using errcode = '22023';
      end if;
    else
      if jsonb_typeof(v_resp) <> 'string' then
        raise exception 'dados_invalidos' using errcode = '22023';
      end if;
      v_resp := to_jsonb(left(btrim(v_resp #>> '{}'), 1000));
      if v_resp #>> '{}' = '' then
        continue;
      end if;
    end if;

    v_respostas := v_respostas || jsonb_build_array(jsonb_build_object(
      'id', v_pergunta ->> 'id',
      'texto', v_pergunta ->> 'texto',
      'tipo', v_pergunta ->> 'tipo',
      'resposta', v_resp
    ));
  end loop;

  -- Freio contra robô, como no diagnóstico. Reenvio do mesmo id não conta.
  if not exists (select 1 from public.avaliacoes where id = v_id) and (
    (select count(*) from public.avaliacoes
      where barbeiro_id = v_barbeiro.id and criado_em > now() - interval '10 minutes') >= 30
    or (select count(*) from public.avaliacoes
      where criado_em > now() - interval '10 minutes') >= 300
  ) then
    raise exception 'muitos_envios' using errcode = '54000';
  end if;

  insert into public.avaliacoes (
    id, barbeiro_id, diagnostico_id, nome, nota, nps, comentario, respostas, idioma
  ) values (
    v_id,
    v_barbeiro.id,
    v_diag,
    left(coalesce(nullif(btrim(coalesce(p_dados ->> 'nome', '')), ''), v_nome, ''), 120),
    (p_dados ->> 'nota')::smallint,
    nullif(p_dados ->> 'nps', '')::smallint,
    left(btrim(coalesce(p_dados ->> 'comentario', '')), 2000),
    v_respostas,
    case
      when p_dados ->> 'idioma' in ('pt-BR', 'en-US', 'es') then p_dados ->> 'idioma'
      else 'pt-BR'
    end
  )
  on conflict do nothing;

  -- Não gravou e não é reenvio: o diagnóstico já tinha avaliação.
  if not exists (select 1 from public.avaliacoes where id = v_id) then
    raise exception 'ja_avaliado' using errcode = '23505';
  end if;

  return json_build_object('id', v_id);
end
$$;

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
revoke all on public.avaliacoes from anon, authenticated, public;
grant select, delete on public.avaliacoes to authenticated;

grant update (avaliacao_ativa, avaliacao_perguntas) on public.perfis to authenticated;

revoke execute on function public.avaliacao_publica(text, uuid) from public;
revoke execute on function public.enviar_avaliacao(text, jsonb) from public;
grant execute on function public.avaliacao_publica(text, uuid) to anon, authenticated;
grant execute on function public.enviar_avaliacao(text, jsonb) to anon, authenticated;

revoke execute on function privado.validar_perguntas() from public, anon, authenticated;
