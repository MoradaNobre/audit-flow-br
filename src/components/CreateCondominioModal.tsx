import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateCondominio } from '@/hooks/useCondominios';

interface CreateCondominioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCondominioModal: React.FC<CreateCondominioModalProps> = ({
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: ''
  });

  const createCondominio = useCreateCondominio();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, informe o nome do condomínio."
      });
      return;
    }

    try {
      await createCondominio.mutateAsync({
        nome: formData.nome.trim(),
        cnpj: formData.cnpj.trim() || undefined,
        endereco: formData.endereco.trim() || undefined
      });

      toast({
        title: "Condomínio criado com sucesso!",
        description: "Agora você pode começar a enviar prestações de contas."
      });

      // Reset form and close modal
      setFormData({ nome: '', cnpj: '', endereco: '' });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar condomínio",
        description: error.message || "Tente novamente."
      });
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', cnpj: '', endereco: '' });
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
                Novo Condomínio
              </DialogTitle>
              <DialogDescription>
                Cadastre um novo condomínio para gerenciar prestações de contas
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
              disabled={createCondominio.isPending}
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
              disabled={createCondominio.isPending}
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
              disabled={createCondominio.isPending}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createCondominio.isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createCondominio.isPending || !formData.nome.trim()}
              className="flex-1 gap-2"
            >
              {createCondominio.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Criar Condomínio
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};