import { Button } from "@/components/ui/button";
import { Trash2, BarChart3 } from "lucide-react";
import { useDeleteCondominio } from "@/hooks/useCondominios";
import { useDeletePrestacao, useAnalyzePrestacao } from "@/hooks/usePrestacoes";
import { useDeleteRelatorio } from "@/hooks/useRelatorios";
import { useIsAdmin } from "@/hooks/useRoles";
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
  const isAdmin = useIsAdmin();
  const { toast } = useToast();
  
  const deleteCondominio = useDeleteCondominio();
  const deletePrestacao = useDeletePrestacao();
  const deleteRelatorio = useDeleteRelatorio();
  const analyzePrestacao = useAnalyzePrestacao();

  if (!isAdmin) return null;

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
    <div className="flex gap-2">
      {type === 'prestacao' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzePrestacao.isPending}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          {analyzePrestacao.isPending ? "Analisando..." : "Analisar"}
        </Button>
      )}
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {name ? `"${name}"` : 'este item'}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};