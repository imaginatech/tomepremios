import React, { useState, useEffect } from 'react';
import PalpitecoSettings from './PalpitecoSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Trophy, Eye, CheckCircle, Loader2 } from 'lucide-react';

interface PollOption {
  label: string;
}

interface Poll {
  id: string;
  title: string;
  question: string | null;
  options: PollOption[];
  winning_option: number | null;
  prize_amount: number;
  entry_price: number;
  status: string;
  category: string | null;
  created_at: string;
}

const PalpitecoManagement = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEntries, setShowEntries] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [prizeAmount, setPrizeAmount] = useState('');
  const [entryPrice, setEntryPrice] = useState('5');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => { loadPolls(); }, []);

  const loadPolls = async () => {
    const { data, error } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
    if (!error) {
      setPolls((data || []).map((p: any) => ({
        ...p,
        options: (typeof p.options === 'string' ? JSON.parse(p.options) : p.options) as PollOption[],
      })));
    }
    setLoading(false);
  };

  const createPoll = async () => {
    if (!title || options.some(o => !o.trim()) || !prizeAmount) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('polls').insert({
      title,
      question: question || null,
      options: options.map(label => ({ label })),
      prize_amount: parseFloat(prizeAmount),
      entry_price: parseFloat(entryPrice),
      category: category || null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Enquete criada!' });
      setShowCreate(false);
      resetForm();
      loadPolls();
    }
  };

  const resetForm = () => {
    setTitle(''); setQuestion(''); setOptions(['', '']); setPrizeAmount(''); setEntryPrice('5'); setCategory('');
  };

  const setWinner = async (pollId: string, winningOption: number) => {
    const { error } = await supabase.from('polls').update({ winning_option: winningOption, status: 'completed' }).eq('id', pollId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Opção vencedora definida!' });
      loadPolls();
    }
  };

  const closePoll = async (pollId: string) => {
    const { error } = await supabase.from('polls').update({ status: 'closed' }).eq('id', pollId);
    if (!error) { toast({ title: 'Enquete encerrada' }); loadPolls(); }
  };

  const viewEntries = async (pollId: string) => {
    setShowEntries(pollId);
    setEntriesLoading(true);
    const { data } = await supabase.from('poll_entries').select('*, profiles:user_id(full_name, whatsapp)').eq('poll_id', pollId);
    setEntries(data || []);
    setEntriesLoading(false);
  };

  const statusColors: Record<string, string> = {
    active: 'bg-primary text-primary-foreground',
    closed: 'bg-amber-600 text-white',
    completed: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <PalpitecoSettings />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Gestão do Palpitaco</h2>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Nova Enquete</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : polls.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma enquete cadastrada.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => (
            <Card key={poll.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{poll.title}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge className={statusColors[poll.status]}>{poll.status}</Badge>
                      {poll.category && <Badge variant="outline">{poll.category}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Prêmio</p>
                    <p className="font-bold text-accent">R$ {poll.prize_amount.toFixed(2)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Opções:</p>
                  <div className="space-y-1">
                    {poll.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm">{i + 1}. {opt.label}</span>
                        {poll.winning_option === i && <Badge className="bg-primary text-primary-foreground text-xs">Vencedora</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => viewEntries(poll.id)}>
                    <Eye className="w-3 h-3 mr-1" /> Ver Participações
                  </Button>
                  {poll.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => closePoll(poll.id)}>Encerrar</Button>
                  )}
                  {(poll.status === 'active' || poll.status === 'closed') && poll.winning_option === null && (
                    <Select onValueChange={(v) => setWinner(poll.id, parseInt(v))}>
                      <SelectTrigger className="w-48 h-9">
                        <SelectValue placeholder="Definir vencedora" />
                      </SelectTrigger>
                      <SelectContent>
                        {poll.options.map((opt, i) => (
                          <SelectItem key={i} value={String(i)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nova Enquete</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título da Enquete</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: BBB 2026 – Paredão" />
            </div>
            <div>
              <Label>Pergunta</Label>
              <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ex: Quem será eliminado?" />
            </div>
            <div>
              <Label>Opções de Resposta</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <Input value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} placeholder={`Opção ${i + 1}`} />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setOptions([...options, ''])}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Opção
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prêmio (R$)</Label>
                <Input type="number" value={prizeAmount} onChange={e => setPrizeAmount(e.target.value)} placeholder="100.00" />
              </div>
              <div>
                <Label>Valor Participação (R$)</Label>
                <Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Esportes">Esportes</SelectItem>
                  <SelectItem value="Famosos">Famosos</SelectItem>
                  <SelectItem value="Entretenimento">Entretenimento</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={createPoll} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Criar Enquete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entries Dialog */}
      <Dialog open={!!showEntries} onOpenChange={() => setShowEntries(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Participações</DialogTitle></DialogHeader>
          {entriesLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma participação ainda.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {entries.map((entry: any) => {
                const poll = polls.find(p => p.id === entry.poll_id);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">{entry.profiles?.full_name || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">
                        Escolha: {poll?.options[entry.selected_option]?.label || `Opção ${entry.selected_option + 1}`}
                      </p>
                    </div>
                    <Badge variant={entry.payment_status === 'paid' ? 'default' : 'outline'}>
                      {entry.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PalpitecoManagement;
