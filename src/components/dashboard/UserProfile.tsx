
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, User, Phone, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  pix_key: string | null;
}

const UserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp: '',
    pix_key: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile for user:', user?.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, whatsapp, pix_key')
        .eq('id', user?.id)
        .single();

      console.log('Profile data:', data);
      console.log('Profile error:', error);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar perfil. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          whatsapp: data.whatsapp || '',
          pix_key: data.pix_key || ''
        });
      } else {
        // Se não existe perfil, criar um novo
        console.log('Creating new profile for user:', user?.id);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user?.id,
            full_name: user?.user_metadata?.full_name || null,
            whatsapp: user?.user_metadata?.whatsapp || null
          }])
          .select('id, full_name, whatsapp, pix_key')
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          console.log('New profile created:', newProfile);
          setProfile(newProfile);
          setFormData({
            full_name: newProfile.full_name || '',
            whatsapp: newProfile.whatsapp || '',
            pix_key: newProfile.pix_key || ''
          });
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 3) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setFormData(prev => ({ ...prev, whatsapp: formatted }));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          whatsapp: formData.whatsapp,
          pix_key: formData.pix_key
        })
        .eq('id', user?.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Erro",
          description: "Erro ao salvar perfil. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setIsEditing(false);
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar perfil. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      whatsapp: profile?.whatsapp || '',
      pix_key: profile?.pix_key || ''
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados Pessoais
          </CardTitle>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            value={user?.email || ''}
            disabled
            className="bg-muted"
          />
        </div>

        <div>
          <Label htmlFor="full_name">Nome Completo</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            disabled={!isEditing}
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <Label htmlFor="whatsapp" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            WhatsApp
          </Label>
          <Input
            id="whatsapp"
            value={formData.whatsapp}
            onChange={handleWhatsAppChange}
            disabled={!isEditing}
            placeholder="(11) 99999-9999"
            maxLength={16}
          />
        </div>

        <div>
          <Label htmlFor="pix_key" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Chave PIX
          </Label>
          <Input
            id="pix_key"
            value={formData.pix_key}
            onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
            disabled={!isEditing}
            placeholder="Sua chave PIX para receber prêmios"
          />
        </div>

      </CardContent>
    </Card>
  );
};

export default UserProfile;
