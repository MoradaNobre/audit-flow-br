import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProcessingQueueRow, ProcessingStatus, TaskPriority } from '@/integrations/supabase/types_temp';

// Usar tipos importados
export type { ProcessingStatus, TaskPriority } from '@/integrations/supabase/types_temp';

export interface ProcessingTask extends ProcessingQueueRow {
  processing_logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    details?: any;
  }>;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

/**
 * Hook para monitorar status de processamento de uma tarefa específica
 */
export function useProcessingStatus(taskId?: string) {
  const [task, setTask] = useState<ProcessingTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Busca dados da tarefa
  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('processing_queue')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setTask(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar tarefa';
      setError(errorMessage);
      console.error('Erro ao buscar tarefa:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Cancela uma tarefa
  const cancelTask = useCallback(async () => {
    if (!taskId) return false;

    try {
      const { error: cancelError } = await (supabase as any)
        .from('processing_queue')
        .update({ 
          status: 'cancelled',
          stage_message: 'Cancelado pelo usuário',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (cancelError) {
        throw cancelError;
      }

      toast({
        title: "Tarefa cancelada",
        description: "O processamento foi cancelado com sucesso.",
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cancelar tarefa';
      toast({
        title: "Erro ao cancelar",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [taskId, toast]);

  // Reprocessa uma tarefa falhada
  const retryTask = useCallback(async () => {
    if (!taskId) return false;

    try {
      const { error: retryError } = await (supabase as any)
        .from('processing_queue')
        .update({ 
          status: 'pending',
          progress_percentage: 0,
          current_stage: 'queued',
          stage_message: 'Aguardando reprocessamento...',
          error_message: null,
          error_details: null,
          started_at: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (retryError) {
        throw retryError;
      }

      toast({
        title: "Tarefa reenviada",
        description: "A tarefa foi adicionada novamente à fila de processamento.",
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reprocessar tarefa';
      toast({
        title: "Erro ao reprocessar",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [taskId, toast]);

  // Subscription para atualizações em tempo real
  useEffect(() => {
    if (!taskId) return;

    // Busca inicial
    fetchTask();

    // Subscription para mudanças
    const subscription = supabase
      .channel(`processing_task_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'processing_queue',
          filter: `id=eq.${taskId}`
        },
        (payload) => {
          console.log('Atualização da tarefa recebida:', payload);
          setTask(payload.new as ProcessingTask);
          
          // Notificações para mudanças importantes
          const newTask = payload.new as ProcessingTask;
          if (newTask.status === 'completed') {
            toast({
              title: "Processamento concluído!",
              description: `${newTask.file_name} foi processado com sucesso.`,
            });
          } else if (newTask.status === 'failed') {
            toast({
              title: "Erro no processamento",
              description: newTask.error_message || 'Falha no processamento do arquivo.',
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [taskId, fetchTask, toast]);

  return {
    task,
    loading,
    error,
    cancelTask,
    retryTask,
    refetch: fetchTask
  };
}

/**
 * Hook para monitorar todas as tarefas do usuário
 */
export function useUserProcessingTasks() {
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca todas as tarefas do usuário
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('processing_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTasks(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar tarefas';
      setError(errorMessage);
      console.error('Erro ao buscar tarefas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscription para atualizações
  useEffect(() => {
    fetchTasks();

    const subscription = supabase
      .channel('user_processing_tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_queue'
        },
        () => {
          fetchTasks(); // Recarrega todas as tarefas quando há mudanças
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks
  };
}

/**
 * Hook para estatísticas da fila de processamento
 */
export function useQueueStats() {
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('processing_queue')
        .select('status');

      if (error) {
        throw error;
      }

      // Calcula estatísticas
      const statsCount = (data || []).reduce((acc, item) => {
        acc[item.status as ProcessingStatus] = (acc[item.status as ProcessingStatus] || 0) + 1;
        acc.total++;
        return acc;
      }, {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        total: 0
      } as QueueStats);

      setStats(statsCount);
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Atualiza estatísticas a cada 30 segundos
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
}
