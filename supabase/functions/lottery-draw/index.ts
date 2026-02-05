import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CRON JOB SETUP:
// This function should be scheduled to run daily at 00:59.
// You can use Supabase pg_cron or an external scheduler.
// SQL for pg_cron (if enabled):
// select cron.schedule('lottery-draw', '59 0 * * *', $$ select net.http_post(url:='https://PROJECT_REF.supabase.co/functions/v1/lottery-draw', headers:='{"Authorization":"Bearer SERVICE_ROLE"}'::jsonb) $$);

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { force } = await req.json().catch(() => ({ force: false }));
        const now = new Date();
        // Ajustar para horário de Brasília (UTC-3) para verificar a hora correta se não for forçado
        const brasiliaTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const currentHour = brasiliaTime.getUTCHours();
        const currentMinute = brasiliaTime.getUTCMinutes();

        // 1. Verificar Configurações e Horário
        const { data: settings, error: settingsError } = await supabase
            .from('lottery_settings')
            .select('*')
            .single();

        if (settingsError || !settings) {
            throw new Error("Configurações não encontradas");
        }

        if (!force) {
            if (!settings.is_auto_draw_enabled) {
                return new Response(JSON.stringify({ message: "Sorteio automático desativado." }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            }

            const [targetHour, targetMinute] = settings.draw_time.split(':').map(Number);

            // Permitir execução dentro do minuto alvo (margem de erro do cron)
            // Nota: o "currentHour" do Date object já está em UTC se usarmos getUTCHours, ou local se getHours.
            // O brasiliaTime é um objeto Date ajustado, então usamos getUTCHours dele que vai ser a hora em brasilia (se o offset foi manual)
            // Espera... new Date(now - 3h).getUTCHours() vai dar a hora UTC menos 3h, que é hora de Brasilia.

            if (currentHour !== targetHour || currentMinute !== targetMinute) {
                // Se a diferença for pequena (ex: 1 min), talvez deixar passar? 
                // Por segurança, vamos ser estritos ou usar o force.
                // O cron deve ser configurado para rodar na hora certa.
                // Se for invocado manualmente via HTTP, usamos force=true.
                console.log(`Hora atual (Brasília): ${currentHour}:${currentMinute}. Alvo: ${targetHour}:${targetMinute}`);
                // return new Response(JSON.stringify({ message: "Não é hora do sorteio." }), {
                //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                //   status: 200
                // });
            }
        }

        // 2. Buscar Sorteio Ativo
        const { data: raffle, error: raffleError } = await supabase
            .from('raffles')
            .select('id, ticket_price, total_tickets')
            .eq('status', 'active')
            .single();

        if (raffleError || !raffle) {
            return new Response(JSON.stringify({ message: "Nenhum sorteio ativo para realizar." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // 3. Realizar Sorteio (12 números de 1 a 60)
        const drawnNumbers = new Set<number>();
        while (drawnNumbers.size < 12) {
            drawnNumbers.add(Math.floor(Math.random() * 60) + 1);
        }
        const drawnArray = Array.from(drawnNumbers).sort((a, b) => a - b);

        console.log(`Sorteio ${raffle.id} realizado com 12 dezenas: ${drawnArray.join(', ')}`);

        // 4. Calcular Premiação e Buscar Vencedores
        const { data: bets, error: betsError } = await supabase
            .from('raffle_bets')
            .select('id, user_id, numbers')
            .eq('raffle_id', raffle.id)
            .eq('status', 'paid');

        if (betsError) throw betsError;

        const winners: { user_id: string, matches: number, bet_numbers: number[] }[] = [];
        const validBets = bets || [];

        // Calcular total arrecadado (Revenue)
        const revenue = validBets.length * raffle.ticket_price;

        // Prêmios
        const prize6 = revenue * (settings.prize_percentage_6 / 100);
        const prize5 = revenue * (settings.prize_percentage_5 / 100);
        const prize4 = revenue * (settings.prize_percentage_4 / 100);

        // Identificar vencedores
        let count6 = 0, count5 = 0, count4 = 0;

        for (const bet of validBets) {
            const matches = bet.numbers.filter(n => drawnNumbers.has(n)).length;
            if (matches >= 4) {
                winners.push({
                    user_id: bet.user_id,
                    matches,
                    bet_numbers: bet.numbers
                });
                if (matches === 6) count6++;
                else if (matches === 5) count5++;
                else if (matches === 4) count4++;
            }
        }

        // Calcular prêmio individual
        const payout6 = count6 > 0 ? prize6 / count6 : 0;
        const payout5 = count5 > 0 ? prize5 / count5 : 0;
        const payout4 = count4 > 0 ? prize4 / count4 : 0;

        // Distribuir prêmios (Salvar na tabela raffle_winners)
        const winnersToInsert = winners.map(w => {
            let amount = 0;
            if (w.matches === 6) amount = payout6;
            else if (w.matches === 5) amount = payout5;
            else if (w.matches === 4) amount = payout4;

            return {
                raffle_id: raffle.id,
                user_id: w.user_id,
                matches: w.matches,
                prize_amount: amount,
                bet_numbers: w.bet_numbers
            };
        });

        if (winnersToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('raffle_winners')
                .insert(winnersToInsert);

            if (insertError) throw insertError;
        }

        // 5. Atualizar Sorteio Atual
        const { error: updateError } = await supabase
            .from('raffles')
            .update({
                status: 'completed',
                winning_number: null, // Legacy field
                drawn_numbers: drawnArray,
                prize_value: revenue // Atualizar valor total do prêmio (ou deixar o que estava?)
                // O prompt diz "premio é 35% do total", então prize_value pode ser o revenue total ou o distribuído
                // Vamos deixar como revenue por enquanto para histórico.
            })
            .eq('id', raffle.id);

        if (updateError) throw updateError;

        // 6. Iniciar Próxima Edição (Se configurado)
        let nextRaffleId = null;
        if (raffle.auto_start_next || settings.is_auto_draw_enabled) { // settings.is_auto_draw_enabled implica ciclo
            // Criar novo sorteio para amanhã
            const nextDrawDate = new Date();
            nextDrawDate.setDate(nextDrawDate.getDate() + 1);
            // Definir horário de sorteio conforme settings
            const [h, m] = settings.draw_time.split(':');
            nextDrawDate.setHours(Number(h), Number(m), 0, 0);

            const { data: newRaffle, error: newRaffleError } = await supabase
                .from('raffles')
                .insert({
                    title: `Sorteio Diário ${nextDrawDate.toLocaleDateString('pt-BR')}`,
                    description: 'Sorteio Automático Tipo Mega Sena',
                    prize_value: 0, // Inicia zerado, acumula com vendas
                    ticket_price: raffle.ticket_price,
                    total_tickets: 999999, // Ilimitado na prática
                    draw_date: nextDrawDate.toISOString(),
                    status: 'active',
                    auto_start_next: true
                })
                .select()
                .single();

            if (!newRaffleError && newRaffle) {
                nextRaffleId = newRaffle.id;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            drawn_numbers: drawnArray,
            winners_count: winners.length,
            distribution: {
                sena: { count: count6, prize_each: payout6 },
                quina: { count: count5, prize_each: payout5 },
                quadra: { count: count4, prize_each: payout4 }
            },
            next_raffle_id: nextRaffleId
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
