import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  Search, 
  Link as LinkIcon, 
  Trophy,
  TrendingUp,
  Eye,
  Copy,
  Gift,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    whatsapp: string | null;
  } | null;
}

interface Referral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  status: string;
  raffle_id: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    whatsapp: string | null;
  } | null;
}

interface BonusNumber {
  id: string;
  affiliate_id: string;
  raffle_id: string;
  bonus_numbers: number[];
  created_at: string;
  raffles: {
    title: string;
    status: string;
  } | null;
}

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalBonusNumbers: number;
  conversionRate: number;
}

const AffiliateManagement = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [filteredAffiliates, setFilteredAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [bonusNumbers, setBonusNumbers] = useState<BonusNumber[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [affiliateStats, setAffiliateStats] = useState<Record<string, AffiliateStats>>({});

  useEffect(() => {
    fetchAffiliates();
  }, []);

  useEffect(() => {
    filterAffiliates();
  }, [searchTerm, affiliates]);

  const fetchAffiliates = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select(`
          *,
          profiles (
            full_name,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAffiliates(data || []);
      
      // Buscar estatísticas para cada afiliado
      if (data) {
        const statsPromises = data.map(affiliate => fetchAffiliateStats(affiliate.id));
        const statsResults = await Promise.all(statsPromises);
        
        const statsMap = data.reduce((acc, affiliate, index) => {
          acc[affiliate.id] = statsResults[index];
          return acc;
        }, {} as Record<string, AffiliateStats>);
        
        setAffiliateStats(statsMap);
      }
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar afiliados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAffiliateStats = async (affiliateId: string): Promise<AffiliateStats> => {
    try {
      // Total de indicações
      const { data: referralsData } = await supabase
        .from('affiliate_referrals')
        .select('status')
        .eq('affiliate_id', affiliateId);

      const totalReferrals = referralsData?.length || 0;
      const activeReferrals = referralsData?.filter(r => r.status === 'participant').length || 0;
      
      // Total de números bônus
      const { data: bonusData } = await supabase
        .from('affiliate_bonus_numbers')
        .select('bonus_numbers')
        .eq('affiliate_id', affiliateId);

      const totalBonusNumbers = bonusData?.reduce((total, bonus) => 
        total + (bonus.bonus_numbers?.length || 0), 0) || 0;

      const conversionRate = totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;

      return {
        totalReferrals,
        activeReferrals,
        totalBonusNumbers,
        conversionRate
      };
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        totalBonusNumbers: 0,
        conversionRate: 0
      };
    }
  };

  const fetchAffiliateDetails = async (affiliate: Affiliate) => {
    try {
      // Buscar indicações
      const { data: referralsData } = await supabase
        .from('affiliate_referrals')
        .select(`
          *,
          profiles!affiliate_referrals_referred_user_id_fkey (
            full_name,
            whatsapp
          )
        `)
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });

      // Buscar números bônus
      const { data: bonusData } = await supabase
        .from('affiliate_bonus_numbers')
        .select(`
          *,
          raffles (
            title,
            status
          )
        `)
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false });

      setReferrals(referralsData || []);
      setBonusNumbers(bonusData || []);
      setSelectedAffiliate(affiliate);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching affiliate details:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do afiliado",
        variant: "destructive"
      });
    }
  };

  const filterAffiliates = () => {
    if (!searchTerm) {
      setFilteredAffiliates(affiliates);
      return;
    }

    const filtered = affiliates.filter(affiliate => 
      affiliate.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.affiliate_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.profiles?.whatsapp?.includes(searchTerm)
    );
    
    setFilteredAffiliates(filtered);
  };

  const copyAffiliateLink = (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "Link do afiliado copiado para a área de transferência"
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="default">Ativo</Badge>;
    }
    return <Badge variant="secondary">Inativo</Badge>;
  };

  const getReferralStatusBadge = (status: string) => {
    if (status === 'participant') {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Participante</Badge>;
    }
    return <Badge variant="destructive">Não participante</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Afiliados</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar afiliados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Afiliados</p>
              <p className="text-2xl font-bold">{affiliates.length}</p>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Afiliados Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {affiliates.filter(a => a.status === 'active').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Indicações</p>
              <p className="text-2xl font-bold text-blue-600">
                {Object.values(affiliateStats).reduce((total, stats) => total + stats.totalReferrals, 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversões</p>
              <p className="text-2xl font-bold text-accent">
                {Object.values(affiliateStats).reduce((total, stats) => total + stats.activeReferrals, 0)}
              </p>
            </div>
            <Trophy className="w-8 h-8 text-accent" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAffiliates.map((affiliate) => {
          const stats = affiliateStats[affiliate.id] || {
            totalReferrals: 0,
            activeReferrals: 0,
            totalBonusNumbers: 0,
            conversionRate: 0
          };

          return (
            <Card key={affiliate.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {getStatusBadge(affiliate.status)}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyAffiliateLink(affiliate.affiliate_code)}
                    title="Copiar link do afiliado"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchAffiliateDetails(affiliate)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg truncate">
                  {affiliate.profiles?.full_name || 'Nome não informado'}
                </h3>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  <span className="font-mono">{affiliate.affiliate_code}</span>
                </div>

                {affiliate.profiles?.whatsapp && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{affiliate.profiles.whatsapp}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Indicações:</span>
                  <span className="font-semibold">{stats.totalReferrals}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversões:</span>
                  <span className="font-semibold text-green-600">{stats.activeReferrals}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa:</span>
                  <span className="font-semibold text-accent">
                    {stats.conversionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Números Bônus:</span>
                  <span className="font-semibold text-purple-600">{stats.totalBonusNumbers}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredAffiliates.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum afiliado encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Ainda não há afiliados cadastrados.'}
          </p>
        </div>
      )}

      {/* Modal de detalhes do afiliado */}
      {showDetails && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold">
                    Detalhes do Afiliado: {selectedAffiliate.profiles?.full_name || 'Nome não informado'}
                  </h3>
                  <p className="text-muted-foreground">Código: {selectedAffiliate.affiliate_code}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  Fechar
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Indicações */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Indicações ({referrals.length})
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {referrals.map((referral) => (
                      <Card key={referral.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium">
                            {referral.profiles?.full_name || 'Nome não informado'}
                          </h5>
                          {getReferralStatusBadge(referral.status)}
                        </div>
                        {referral.profiles?.whatsapp && (
                          <p className="text-sm text-muted-foreground">
                            {referral.profiles.whatsapp}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Indicado em: {format(new Date(referral.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </Card>
                    ))}
                    {referrals.length === 0 && (
                      <div className="text-center py-8">
                        <UserX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Nenhuma indicação ainda</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Números Bônus */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Números Bônus Ganhos ({bonusNumbers.length})
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {bonusNumbers.map((bonus) => (
                      <Card key={bonus.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium">
                            {bonus.raffles?.title || 'Sorteio'}
                          </h5>
                          <Badge variant={bonus.raffles?.status === 'completed' ? 'secondary' : 'default'}>
                            {bonus.raffles?.status === 'completed' ? 'Concluído' : 'Ativo'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {bonus.bonus_numbers?.map((number, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-mono"
                            >
                              {number.toString().padStart(3, '0')}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ganho em: {format(new Date(bonus.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </Card>
                    ))}
                    {bonusNumbers.length === 0 && (
                      <div className="text-center py-8">
                        <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Nenhum número bônus ganho ainda</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AffiliateManagement;