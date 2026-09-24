import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response(JSON.stringify({ error: 'Parametro id mancante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Query principale sull'anagrafica
    const { data: ana, error: anaErr } = await supabase
      .from('Anagrafiche')
      .select(`
        codiceanagrafica,
        ragionesociale,
        titolare,
        piva,
        codicefiscale,
        indirizzo,
        cap,
        comune,
        provincia,
        telefono,
        cellulare,
        email,
        categoriaateco,
        tipoattivita,
        settorecna,
        codateco,
        qualifica,
        alboartigiani,
        formagiuridica,
        cciaa,
        dipendenti,
        unitalocali,
        datainizio,
        tipo,
        stato,
        tessera
      `)
      .eq('codiceanagrafica', id)
      .single()

    if (anaErr || !ana) {
      return new Response(JSON.stringify({ error: 'Impresa non trovata' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Contratti attivi
    const { data: contratti } = await supabase
      .from('crm_new_companies')
      .select('name, created_at, mrr, status')
      .eq('codiceanagrafica', id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Contatori: addetti, contratti, servizi
    const { count: nContratti } = await supabase
      .from('crm_new_companies')
      .select('*', { count: 'exact', head: true })
      .eq('codiceanagrafica', id)

    const result = {
      ...ana,
      contratti: contratti || [],
      nContratti: nContratti || 0,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
