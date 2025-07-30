import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Star, Trophy, User, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface InstantPrize {
  id: string;
  raffle_id: string;
  ticket_numbers: number[];
  prize_amount: number;
  prize_description: string;
  claimed: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
}

interface InstantPrizeWinner {
  id: string;
  prize_amount: number;
  prize_description: string;
  ticket_numbers: number[];
  claimed_at: string;
  claimed_by: string;
  winner_name: string;
  winner_whatsapp: string;
}

interface Raffle {
  id: string;
  title: string;
  status: string;
  total_tickets: number;
}

export function InstantPrizesManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [prizes, setPrizes] = useState<InstantPrize[]>([]);
  const [winners, setWinners] = useState<InstantPrizeWinner[]>([]);
  const [activeRaffle, setActiveRaffle] = useState<Raffle | null>(null);
  const [soldNumbers, setSoldNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [prizeAmount, setPrizeAmount] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("Prêmio Instantâneo");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar sorteio ativo
      const { data: raffleData } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (raffleData) {
        setActiveRaffle(raffleData);
        
        // Carregar números vendidos
        const { data: ticketsData } = await supabase
          .from('raffle_tickets')
          .select('ticket_number')
          .eq('raffle_id', raffleData.id)
          .eq('payment_status', 'paid');

        setSoldNumbers(ticketsData?.map(t => t.ticket_number) || []);

        // Carregar prêmios instantâneos
        const { data: prizesData } = await supabase
          .from('instant_prizes')
          .select('*')
          .eq('raffle_id', raffleData.id)
          .order('created_at', { ascending: false });

        setPrizes(prizesData || []);

        // Carregar ganhadores dos prêmios instantâneos
        const { data: winnersData } = await supabase
          .from('instant_prizes')
          .select('id, prize_amount, prize_description, ticket_numbers, claimed_at, claimed_by')
          .eq('raffle_id', raffleData.id)
          .eq('claimed', true)
          .order('claimed_at', { ascending: false });

        if (winnersData && winnersData.length > 0) {
          // Buscar informações dos usuários separadamente
          const userIds = winnersData.map(w => w.claimed_by).filter(Boolean);
          const { data: usersData } = await supabase
            .from('profiles')
            .select('id, full_name, whatsapp')
            .in('id', userIds);

          const formattedWinners = winnersData.map(winner => {
            const userInfo = usersData?.find(u => u.id === winner.claimed_by);
            return {
              id: winner.id,
              prize_amount: winner.prize_amount,
              prize_description: winner.prize_description,
              ticket_numbers: winner.ticket_numbers,
              claimed_at: winner.claimed_at!,
              claimed_by: winner.claimed_by!,
              winner_name: userInfo?.full_name || 'Nome não informado',
              winner_whatsapp: userInfo?.whatsapp || 'WhatsApp não informado'
            };
          });

          setWinners(formattedWinners);
        } else {
          setWinners([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos prêmios instantâneos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNumberToggle = (number: number) => {
    if (soldNumbers.includes(number)) {
      toast({
        title: "Número já vendido",
        description: "Este número já foi vendido e não pode receber prêmio instantâneo",
        variant: "destructive",
      });
      return;
    }

    setSelectedNumbers(prev => 
      prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
  };

  const handleCreatePrize = async () => {
    if (!activeRaffle || selectedNumbers.length === 0 || !prizeAmount) {
      toast({
        title: "Dados incompletos",
        description: "Selecione números e defina o valor do prêmio",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('instant_prizes')
        .insert({
          raffle_id: activeRaffle.id,
          ticket_numbers: selectedNumbers,
          prize_amount: parseFloat(prizeAmount),
          prize_description: prizeDescription,
        });

      if (error) throw error;

      toast({
        title: "Prêmio criado!",
        description: `Prêmio de R$ ${prizeAmount} criado para ${selectedNumbers.length} números`,
      });

      // Limpar form
      setSelectedNumbers([]);
      setPrizeAmount("");
      setPrizeDescription("Prêmio Instantâneo");
      
      // Recarregar dados
      loadData();
    } catch (error) {
      console.error('Erro ao criar prêmio:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar prêmio instantâneo",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePrize = async (prizeId: string) => {
    try {
      const { error } = await supabase
        .from('instant_prizes')
        .delete()
        .eq('id', prizeId);

      if (error) throw error;

      toast({
        title: "Prêmio removido",
        description: "Prêmio instantâneo removido com sucesso",
      });

      loadData();
    } catch (error) {
      console.error('Erro ao remover prêmio:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover prêmio instantâneo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  if (!activeRaffle) {
    return (
      <Alert>
        <AlertDescription>
          Nenhum sorteio ativo encontrado. Crie um sorteio primeiro para configurar prêmios instantâneos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Prêmios Instantâneos</h2>
        <p className="text-muted-foreground">
          Configure números premiados para o sorteio: {activeRaffle.title}
        </p>
      </div>

      {/* Criar Novo Prêmio */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Prêmio Instantâneo</CardTitle>
          <CardDescription>
            Selecione números e configure o prêmio que será entregue instantaneamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prize-amount">Valor do Prêmio (R$)</Label>
              <Input
                id="prize-amount"
                type="number"
                step="0.01"
                value={prizeAmount}
                onChange={(e) => setPrizeAmount(e.target.value)}
                placeholder="25.00"
              />
            </div>
            <div>
              <Label htmlFor="prize-description">Descrição</Label>
              <Input
                id="prize-description"
                value={prizeDescription}
                onChange={(e) => setPrizeDescription(e.target.value)}
                placeholder="Prêmio Instantâneo"
              />
            </div>
          </div>

          <div>
            <Label>Números Selecionados ({selectedNumbers.length})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedNumbers.map(num => (
                <Badge key={num} variant="secondary" className="cursor-pointer" onClick={() => handleNumberToggle(num)}>
                  {num.toString().padStart(3, '0')} ✕
                </Badge>
              ))}
            </div>
          </div>

          {/* Seletor de Números Simplificado */}
          <div>
            <Label>Selecionar Números (1-{activeRaffle.total_tickets})</Label>
            <div className="grid grid-cols-10 gap-2 mt-2 max-h-64 overflow-y-auto">
              {Array.from({ length: activeRaffle.total_tickets }, (_, i) => i + 1).map(num => {
                const isSold = soldNumbers.includes(num);
                const isSelected = selectedNumbers.includes(num);
                
                return (
                  <Button
                    key={num}
                    size="sm"
                    variant={isSelected ? "default" : isSold ? "destructive" : "outline"}
                    onClick={() => handleNumberToggle(num)}
                    disabled={isSold}
                    className="h-8 text-xs"
                  >
                    {num.toString().padStart(3, '0')}
                  </Button>
                );
              })}
            </div>
          </div>

          <Button 
            onClick={handleCreatePrize} 
            disabled={creating || selectedNumbers.length === 0 || !prizeAmount}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {creating ? "Criando..." : "Criar Prêmio Instantâneo"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Prêmios Criados */}
      <Card>
        <CardHeader>
          <CardTitle>Prêmios Configurados</CardTitle>
          <CardDescription>
            Prêmios instantâneos ativos para este sorteio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prizes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum prêmio instantâneo configurado ainda
            </p>
          ) : (
            <div className="space-y-4">
              {prizes.map(prize => (
                <div key={prize.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">R$ {prize.prize_amount.toFixed(2)}</span>
                      <Badge variant={prize.claimed ? "destructive" : "secondary"}>
                        {prize.claimed ? "Reivindicado" : "Disponível"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{prize.prize_description}</p>
                    <div className="flex flex-wrap gap-1">
                      {prize.ticket_numbers.map(num => (
                        <Badge key={num} variant="outline" className="text-xs">
                          {num.toString().padStart(3, '0')}
                        </Badge>
                      ))}
                    </div>
                    {prize.claimed && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reivindicado em: {new Date(prize.claimed_at!).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {!prize.claimed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrize(prize.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ganhadores dos Prêmios Instantâneos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ganhadores dos Prêmios Instantâneos
          </CardTitle>
          <CardDescription>
            Usuários que reivindicaram prêmios instantâneos neste sorteio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {winners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum prêmio instantâneo foi reivindicado ainda
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ganhador</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Números</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {winners.map(winner => (
                  <TableRow key={winner.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{winner.winner_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{winner.winner_whatsapp}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-green-600">
                          R$ {winner.prize_amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {winner.prize_description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {winner.ticket_numbers.map(num => (
                          <Badge key={num} variant="secondary" className="text-xs">
                            {num.toString().padStart(3, '0')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(winner.claimed_at).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(winner.claimed_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}