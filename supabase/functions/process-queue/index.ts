import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tipos para o sistema de queue
interface QueueTask {
  task_id: string;
  prestacao_id: string;
  file_url: string;
  file_name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface ProcessingUpdate {
  task_id: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_stage: string;
  stage_message: string;
  extracted_data?: any;
  error_message?: string;
  error_details?: any;
}

// Configurações
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXTRACT_PDF_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/extract-pdf-data`;

// Cliente Supabase com service role para acesso total
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Atualiza o status de uma tarefa na queue
 */
async function updateTaskStatus(update: ProcessingUpdate): Promise<void> {
  const { error } = await supabase
    .from('processing_queue')
    .update({
      status: update.status,
      progress_percentage: update.progress_percentage,
      current_stage: update.current_stage,
      stage_message: update.stage_message,
      extracted_data: update.extracted_data,
      error_message: update.error_message,
      error_details: update.error_details,
      completed_at: update.status === 'completed' || update.status === 'failed' 
        ? new Date().toISOString() 
        : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', update.task_id);

  if (error) {
    console.error('Erro ao atualizar status da tarefa:', error);
    throw error;
  }
}

/**
 * Adiciona log de processamento
 */
async function addProcessingLog(taskId: string, level: string, message: string, details?: any): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };

  // Busca logs atuais
  const { data: currentTask } = await supabase
    .from('processing_queue')
    .select('processing_logs')
    .eq('id', taskId)
    .single();

  const currentLogs = currentTask?.processing_logs || [];
  const updatedLogs = [...currentLogs, logEntry];

  // Atualiza com novo log
  await supabase
    .from('processing_queue')
    .update({ processing_logs: updatedLogs })
    .eq('id', taskId);
}

/**
 * Processa um PDF usando a Edge Function de extração
 */
async function processPDF(task: QueueTask): Promise<any> {
  console.log(`Iniciando processamento do PDF: ${task.file_name}`);
  
  await updateTaskStatus({
    task_id: task.task_id,
    status: 'processing',
    progress_percentage: 10,
    current_stage: 'downloading',
    stage_message: 'Baixando arquivo PDF...'
  });

  await addProcessingLog(task.task_id, 'INFO', 'Iniciando processamento', {
    file_name: task.file_name,
    file_url: task.file_url,
    priority: task.priority
  });

  try {
    // Chama a Edge Function de extração
    await updateTaskStatus({
      task_id: task.task_id,
      status: 'processing',
      progress_percentage: 30,
      current_stage: 'extracting',
      stage_message: 'Extraindo dados com IA...'
    });

    const response = await fetch(EXTRACT_PDF_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        documentUrl: task.file_url
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na extração: ${response.status} - ${response.statusText}`);
    }

    const extractedData = await response.json();

    await updateTaskStatus({
      task_id: task.task_id,
      status: 'processing',
      progress_percentage: 70,
      current_stage: 'validating',
      stage_message: 'Validando dados extraídos...'
    });

    await addProcessingLog(task.task_id, 'INFO', 'Dados extraídos com sucesso', {
      confidence_score: extractedData.metadata?.confidence_score,
      extraction_method: extractedData.metadata?.extraction_method
    });

    // Atualiza a prestação de contas com os dados extraídos
    await updateTaskStatus({
      task_id: task.task_id,
      status: 'processing',
      progress_percentage: 90,
      current_stage: 'saving',
      stage_message: 'Salvando dados no banco...'
    });

    // Atualiza prestação de contas
    const { error: updateError } = await supabase
      .from('prestacoes_contas')
      .update({
        receitas_total: extractedData.receitas_total,
        despesas_total: extractedData.despesas_total,
        saldo_anterior: extractedData.saldo_anterior,
        saldo_final: extractedData.saldo_final,
        receitas_detalhadas: extractedData.receitas_detalhadas,
        despesas_detalhadas: extractedData.despesas_detalhadas,
        status_analise: 'concluido',
        data_analise: new Date().toISOString(),
        metadata_extracao: extractedData.metadata
      })
      .eq('id', task.prestacao_id);

    if (updateError) {
      throw new Error(`Erro ao atualizar prestação: ${updateError.message}`);
    }

    // Cria relatório de auditoria
    const { error: reportError } = await supabase
      .from('relatorios_auditoria')
      .insert({
        prestacao_id: task.prestacao_id,
        status: 'concluido',
        data_geracao: new Date().toISOString(),
        dados_extraidos: extractedData,
        observacoes: 'Processamento assíncrono concluído com sucesso'
      });

    if (reportError) {
      console.warn('Erro ao criar relatório:', reportError);
      // Não falha o processamento por causa do relatório
    }

    // Marca como concluído
    await updateTaskStatus({
      task_id: task.task_id,
      status: 'completed',
      progress_percentage: 100,
      current_stage: 'completed',
      stage_message: 'Processamento concluído com sucesso!',
      extracted_data: extractedData
    });

    await addProcessingLog(task.task_id, 'SUCCESS', 'Processamento concluído', {
      prestacao_id: task.prestacao_id,
      processing_time: Date.now()
    });

    return extractedData;

  } catch (error) {
    console.error('Erro no processamento:', error);
    
    await updateTaskStatus({
      task_id: task.task_id,
      status: 'failed',
      progress_percentage: 0,
      current_stage: 'error',
      stage_message: 'Erro no processamento',
      error_message: error.message,
      error_details: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });

    await addProcessingLog(task.task_id, 'ERROR', 'Falha no processamento', {
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

/**
 * Obtém próxima tarefa da fila
 */
async function getNextTask(): Promise<QueueTask | null> {
  const { data, error } = await supabase
    .rpc('get_next_queue_task');

  if (error) {
    console.error('Erro ao obter próxima tarefa:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Worker principal que processa a fila
 */
async function processQueue(): Promise<void> {
  console.log('Iniciando processamento da fila...');
  
  while (true) {
    try {
      const task = await getNextTask();
      
      if (!task) {
        console.log('Nenhuma tarefa na fila, aguardando...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
        continue;
      }

      console.log(`Processando tarefa: ${task.task_id} - ${task.file_name}`);
      await processPDF(task);
      console.log(`Tarefa concluída: ${task.task_id}`);
      
    } catch (error) {
      console.error('Erro no worker da fila:', error);
      // Continua processando outras tarefas
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo
    }
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'process';

    switch (action) {
      case 'process':
        // Inicia o processamento da fila (modo worker)
        processQueue(); // Não aguarda, roda em background
        return new Response(
          JSON.stringify({ message: 'Worker da fila iniciado' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      case 'status':
        // Retorna status da fila
        const { data: queueStats } = await supabase
          .from('processing_queue')
          .select('status')
          .then(result => ({
            data: result.data?.reduce((acc, item) => {
              acc[item.status] = (acc[item.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }));

        return new Response(
          JSON.stringify({ queue_stats: queueStats }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
    }

  } catch (error) {
    console.error('Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
