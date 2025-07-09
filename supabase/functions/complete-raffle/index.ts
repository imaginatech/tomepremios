import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting raffle completion check...')

    // Buscar sorteio ativo
    const { data: activeRaffle, error: raffleError } = await supabase
      .from('raffles')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (raffleError || !activeRaffle) {
      console.log('No active raffle found')
      return new Response(
        JSON.stringify({ message: 'No active raffle found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log('Active raffle found:', activeRaffle.id)

    // Verificar quantos tickets foram vendidos
    const { data: soldTickets, error: ticketsError } = await supabase
      .from('raffle_tickets')
      .select('ticket_number')
      .eq('raffle_id', activeRaffle.id)
      .eq('payment_status', 'paid')

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError)
      return new Response(
        JSON.stringify({ error: 'Error fetching tickets' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    const soldCount = soldTickets?.length || 0
    console.log(`Sold tickets: ${soldCount}/${activeRaffle.total_tickets}`)

    // Se ainda não vendeu todos os tickets, não faz nada
    if (soldCount < activeRaffle.total_tickets) {
      return new Response(
        JSON.stringify({ 
          message: 'Raffle not complete yet',
          sold: soldCount,
          total: activeRaffle.total_tickets
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log('All tickets sold! Starting raffle completion process...')

    // Todos os tickets foram vendidos - sortear ganhador
    const soldNumbers = soldTickets.map(ticket => ticket.ticket_number)
    const winningNumber = soldNumbers[Math.floor(Math.random() * soldNumbers.length)]
    
    console.log('Winning number selected:', winningNumber)

    // Atualizar o sorteio atual como concluído
    const { error: updateError } = await supabase
      .from('raffles')
      .update({
        status: 'completed',
        winning_number: winningNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeRaffle.id)

    if (updateError) {
      console.error('Error updating raffle:', updateError)
      return new Response(
        JSON.stringify({ error: 'Error completing raffle' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Raffle completed successfully')

    // Criar novo sorteio ativo (se auto_start_next for true)
    if (activeRaffle.auto_start_next) {
      console.log('Creating new raffle...')
      
      // Calcular próximo número da edição
      const { data: raffleCount } = await supabase
        .from('raffles')
        .select('id', { count: 'exact', head: true })

      const nextEditionNumber = (raffleCount || 0) + 1
      const newTitle = `EDIÇÃO #${String(nextEditionNumber).padStart(3, '0')}`

      const { error: createError } = await supabase
        .from('raffles')
        .insert({
          title: newTitle,
          description: `Concorra a R$${activeRaffle.prize_value} na sua conta hoje ainda!`,
          prize_value: activeRaffle.prize_value,
          ticket_price: activeRaffle.ticket_price,
          total_tickets: activeRaffle.total_tickets,
          draw_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
          status: 'active',
          auto_start_next: true,
          campaign_start_date: new Date().toISOString(),
          campaign_end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })

      if (createError) {
        console.error('Error creating new raffle:', createError)
      } else {
        console.log('New raffle created successfully')
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Raffle completed successfully',
        winning_number: winningNumber,
        raffle_id: activeRaffle.id,
        new_raffle_created: activeRaffle.auto_start_next
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in complete-raffle function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})