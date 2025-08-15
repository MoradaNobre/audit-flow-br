import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Condominio } from '@/hooks/useCondominios';

interface EditCondominioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominio: Condominio | null;
}

export const EditCondominioModal: React.FC<EditCondominioModalProps> = ({
  open,
  onOpenChange,
  condominio
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: ''
  });

  const updateCondominio = useMutation({
    mutationFn: async (data: { id: string; nome: string; cnpj?: string; endereco?: string }) => {
      const { data: result, error } = await supabase
        .from('condominios')
        .update({
          nome: data.nome,
          cnpj: data.cnpj || null,
          endereco: data.endereco || null
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominios'] });
    },
  });

  useEffect(() => {
    if (condominio) {
      setFormData({
        nome: condominio.nome || '',
        cnpj: condominio.cnpj || '',
        endereco: condominio.endereco || ''
      });
    }
  }, [condominio]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!condominio || !formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, informe o nome do condomínio."
      });
      return;
    }

    try {
      await updateCondominio.mutateAsync({
        id: condominio.id,
        nome: formData.nome.trim(),
        cnpj: formData.cnpj.trim() || undefined,
        endereco: formData.endereco.trim() || undefined
      });

      toast({
        title: "Condomínio atualizado com sucesso!",
        description: "As informações foram salvas."
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar condomínio",
        description: error.message || "Tente novamente."
      });
    }
  };

  const resetForm = () => {
    if (condominio) {
      setFormData({
        nome: condominio.nome || '',
        cnpj: condominio.cnpj || '',
        endereco: condominio.endereco || ''
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-md border-border/50 bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Editar Condomínio
              </DialogTitle>
              <DialogDescription>
                Atualize as informações do condomínio
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Condomínio *</Label>
            <Input
              id="nome"
              name="nome"
              placeholder="Ex: Residencial Jardim das Flores"
              value={formData.nome}
              onChange={handleInputChange}
              disabled={updateCondominio.isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ (opcional)</Label>
            <Input
              id="cnpj"
              name="cnpj"
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={handleInputChange}
              disabled={updateCondominio.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço (opcional)</Label>
            <Textarea
              id="endereco"
              name="endereco"
              placeholder="Endereço completo do condomínio"
              value={formData.endereco}
              onChange={handleInputChange}
              disabled={updateCondominio.isPending}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateCondominio.isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateCondominio.isPending || !formData.nome.trim()}
              className="flex-1 gap-2"
            >
              {updateCondominio.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};