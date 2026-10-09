import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '@/config/site.js'

/**
 * Cliente único do Supabase. A sessão do painel fica no localStorage (padrão
 * do supabase-js); o formulário do cliente usa o mesmo cliente sem login,
 * como anon.
 */
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Supabase não configurado: defina QCLI_SUPABASE_URL e QCLI_SUPABASE_KEY ' +
      'no .env (local) ou nas variáveis do Cloudflare Pages e gere o build de novo.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
