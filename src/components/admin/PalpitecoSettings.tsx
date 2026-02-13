import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Settings, Save, Percent, Image as ImageIcon, Loader2 } from 'lucide-react';

interface PalpitecoSettingsData {
  id: string;
  banner_url: string | null;
  platform_percentage: number;
  winners_percentage: number;
  updated_at: string | null;
}

const PalpitecoSettings = () => {
  const [settings, setSettings] = useState<PalpitecoSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('palpiteco_settings')
        .select('*')
        .single();
      if (error) throw error;
      setSettings(data as PalpitecoSettingsData);
    } catch (error) {
      console.error('Error fetching palpiteco settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `palpiteco_${Math.random()}.${fileExt}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('banners').getPublicUrl(fileName);
      setSettings({ ...settings!, banner_url: data.publicUrl });
      toast({ title: 'Imagem carregada!', description: 'Clique em Salvar para persistir.' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro no upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handlePlatformChange = (value: string) => {
    const platform = Math.min(100, Math.max(0, Number(value)));
    setSettings({ ...settings!, platform_percentage: platform, winners_percentage: 100 - platform });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('palpiteco_settings')
        .update({
          banner_url: settings.banner_url,
          platform_percentage: settings.platform_percentage,
          winners_percentage: settings.winners_percentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);
      if (error) throw error;
      toast({ title: 'Configurações salvas!' });
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Carregando configurações...</div>;
  if (!settings) return <div className="p-4 text-center">Nenhuma configuração encontrada.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Settings className="w-5 h-5 mr-2" />
          Configurações do Palpiteco
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Banner Upload */}
            <div className="space-y-2">
              <Label htmlFor="palpiteco_banner" className="flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />
                Banner do Palpiteco
              </Label>
              <Input
                id="palpiteco_banner"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                </div>
              )}
              {settings.banner_url && (
                <div className="mt-2 relative w-full h-32 bg-muted rounded-md overflow-hidden">
                  <img
                    src={settings.banner_url}
                    alt="Banner Palpiteco Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Prize Percentages */}
            <div className="space-y-4">
              <Label className="flex items-center">
                <Percent className="w-4 h-4 mr-2" />
                Porcentagens de Premiação
              </Label>
              <p className="text-xs text-muted-foreground">
                Defina quanto fica para a plataforma e quanto é compartilhado entre os ganhadores.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platform_perc" className="text-xs">Plataforma</Label>
                  <div className="relative">
                    <Input
                      id="platform_perc"
                      type="number"
                      min={0}
                      max={100}
                      value={settings.platform_percentage}
                      onChange={(e) => handlePlatformChange(e.target.value)}
                      className="pr-6"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="winners_perc" className="text-xs">Ganhadores</Label>
                  <div className="relative">
                    <Input
                      id="winners_perc"
                      type="number"
                      value={settings.winners_percentage}
                      disabled
                      className="pr-6 bg-muted"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O valor dos ganhadores é calculado automaticamente (100% - Plataforma).
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PalpitecoSettings;
