import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAdminSettings, useUpsertAdminSettings } from '@/hooks/useAdminSettings';
import { useToast } from '@/hooks/use-toast';

interface LLMSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LLMSettingsDialog = ({ open, onOpenChange }: LLMSettingsDialogProps) => {
  const { data: settings } = useAdminSettings();
  const upsert = useUpsertAdminSettings();
  const { toast } = useToast();

  const [provider, setProvider] = useState<'openai' | 'gemini'>('gemini');
  const [model, setModel] = useState('gemini-2.0-flash-exp');

  useEffect(() => {
    if (settings) {
      setProvider(settings.llm_provider);
      setModel(settings.llm_model);
    }
  }, [settings]);

  const onSave = async () => {
    try {
      await upsert.mutateAsync({ llm_provider: provider, llm_model: model });
      toast({ title: 'Configurações salvas' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configuração de LLM</DialogTitle>
          <DialogDescription>
            Escolha o provedor e o modelo usados na análise automática. As chaves de API devem ser
            configuradas como segredos do projeto (OPENAI_API_KEY e GEMINI_API_KEY).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Provedor</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Exemplos: gemini-2.0-flash-exp, gemini-2.0-flash-001, gpt-4o-mini
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onSave} disabled={upsert.isPending}>
              {upsert.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
