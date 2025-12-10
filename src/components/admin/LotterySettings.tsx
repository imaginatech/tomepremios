import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Settings, Save, Clock, Percent, Image as ImageIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type LotterySettingsData = Database['public']['Tables']['lottery_settings']['Row'];

const LotterySettings = () => {
    const [settings, setSettings] = useState<LotterySettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('lottery_settings')
                .select('*')
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast({
                title: "Erro",
                description: "Erro ao carregar configurações",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Você deve selecionar uma imagem para fazer o upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            setUploading(true);

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('banners')
                .getPublicUrl(filePath);

            setSettings({ ...settings!, banner_url: data.publicUrl } as any);

            toast({
                title: "Sucesso",
                description: "Imagem carregada com sucesso! Clique em Salvar para persistir."
            });
        } catch (error) {
            console.error('Error uploading image:', error);
            toast({
                title: "Erro",
                description: "Erro ao fazer upload da imagem",
                variant: "destructive"
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('lottery_settings')
                .update({
                    draw_time: settings.draw_time,
                    prize_percentage_6: settings.prize_percentage_6,
                    prize_percentage_5: settings.prize_percentage_5,
                    prize_percentage_4: settings.prize_percentage_4,
                    is_auto_draw_enabled: settings.is_auto_draw_enabled,
                    banner_url: (settings as any).banner_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', settings.id);

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: "Configurações salvas com sucesso!"
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({
                title: "Erro",
                description: "Erro ao salvar configurações",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-4 text-center">Carregando configurações...</div>;
    }

    if (!settings) {
        return <div className="p-4 text-center">Nenhuma configuração encontrada.</div>;
    }

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center text-xl">
                    <Settings className="w-5 h-5 mr-2" />
                    Configurações da Loteria Automática
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="draw_time" className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                Horário do Sorteio (Diário)
                            </Label>
                            <Input
                                id="draw_time"
                                type="time"
                                value={settings.draw_time}
                                onChange={(e) => setSettings({ ...settings, draw_time: e.target.value })}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Horário de Brasília. O sorteio ocorrerá automaticamente todos os dias neste horário.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="banner" className="flex items-center">
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Banner da Home
                            </Label>
                            <Input
                                id="banner"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            {(settings as any).banner_url && (
                                <div className="mt-2 relative w-full h-32 bg-muted rounded-md overflow-hidden">
                                    <img
                                        src={(settings as any).banner_url}
                                        alt="Banner Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 md:col-span-2">
                            <Label className="flex items-center">
                                <Percent className="w-4 h-4 mr-2" />
                                Porcentagens de Premiação
                            </Label>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="perc_6" className="text-xs">Sena (6 acertos)</Label>
                                    <div className="relative">
                                        <Input
                                            id="perc_6"
                                            type="number"
                                            value={settings.prize_percentage_6}
                                            onChange={(e) => setSettings({ ...settings, prize_percentage_6: Number(e.target.value) })}
                                            className="pr-6"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs">%</span>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="perc_5" className="text-xs">Quina (5 acertos)</Label>
                                    <div className="relative">
                                        <Input
                                            id="perc_5"
                                            type="number"
                                            value={settings.prize_percentage_5}
                                            onChange={(e) => setSettings({ ...settings, prize_percentage_5: Number(e.target.value) })}
                                            className="pr-6"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs">%</span>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="perc_4" className="text-xs">Quadra (4 acertos)</Label>
                                    <div className="relative">
                                        <Input
                                            id="perc_4"
                                            type="number"
                                            value={settings.prize_percentage_4}
                                            onChange={(e) => setSettings({ ...settings, prize_percentage_4: Number(e.target.value) })}
                                            className="pr-6"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="auto_draw"
                                checked={settings.is_auto_draw_enabled ?? false}
                                onCheckedChange={(checked) => setSettings({ ...settings, is_auto_draw_enabled: checked })}
                            />
                            <Label htmlFor="auto_draw">Ativar Sorteio Automático</Label>
                        </div>

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

export default LotterySettings;
