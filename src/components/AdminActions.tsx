import { Button } from "@/components/ui/button";
import { Trash2, BarChart3 } from "lucide-react";
import { useDeleteCondominio } from "@/hooks/useCondominios";
import { useDeletePrestacao, useAnalyzePrestacao } from "@/hooks/usePrestacoes";
import { useDeleteRelatorio } from "@/hooks/useRelatorios";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminActionsProps {
  type: 'condominio' | 'prestacao' | 'relatorio';
  id: string;
  name?: string;
  onAnalyze?: () => void;
}

export const AdminActions = ({ type, id, name, onAnalyze }: AdminActionsProps) => {
  const { isAdmin, canAnalyzePrestacoes, canDeleteCondominios, canDeleteRelatorios } = usePermissions();
  const { toast } = useToast();
  
  const deleteCondominio = useDeleteCondominio();
  const deletePrestacao = useDeletePrestacao();
  const deleteRelatorio = useDeleteRelatorio();
  const analyzePrestacao = useAnalyzePrestacao();

  // Verificar permissões específicas por tipo
  const canDelete = (type === 'condominio' && canDeleteCondominios) ||
                   (type === 'prestacao' && isAdmin) ||
                   (type === 'relatorio' && canDeleteRelatorios);
                   
  const canAnalyze = type === 'prestacao' && canAnalyzePrestacoes;

  // Se não tem nenhuma permissão, não mostra os botões
  if (!canDelete && !canAnalyze) return null;

  const handleDelete = async () => {
    try {
      switch (type) {
        case 'condominio':
          await deleteCondominio.mutateAsync(id);
          toast({ title: "Condomínio removido com sucesso" });
          break;
        case 'prestacao':
          await deletePrestacao.mutateAsync(id);
          toast({ title: "Prestação de contas removida com sucesso" });
          break;
        case 'relatorio':
          await deleteRelatorio.mutateAsync(id);
          toast({ title: "Relatório removido com sucesso" });
          break;
      }
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Ocorreu um erro ao tentar remover o item.",
        variant: "destructive"
      });
    }
  };

  const handleAnalyze = async () => {
    if (type !== 'prestacao') return;
    
    try {
      await analyzePrestacao.mutateAsync(id);
      toast({ title: "Análise iniciada com sucesso" });
      onAnalyze?.();
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: "Ocorreu um erro ao iniciar a análise.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      {canAnalyze && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleAnalyze();
          }}
          disabled={analyzePrestacao.isPending}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          {analyzePrestacao.isPending ? "Analisando..." : "Analisar"}
        </Button>
      )}
      
      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover {name ? `"${name}"` : 'este item'}? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};