import React from 'react';
import { 
  Clock, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RotateCcw,
  Pause,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProcessingStatus, ProcessingTask, ProcessingStatus } from '@/hooks/useProcessingStatus';
import { formatFileSize } from '@/lib/fileValidation';

interface ProcessingStatusProps {
  taskId: string;
  showDetails?: boolean;
  compact?: boolean;
}

// Configuração de ícones e cores por status
const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Aguardando',
    description: 'Na fila de processamento'
  },
  processing: {
    icon: Upload,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Processando',
    description: 'Em andamento'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Concluído',
    description: 'Processamento finalizado'
  },
  failed: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Falhou',
    description: 'Erro no processamento'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'Cancelado',
    description: 'Cancelado pelo usuário'
  }
};

// Ícones por estágio
const stageIcons = {
  queued: Clock,
  downloading: Upload,
  extracting: FileText,
  validating: CheckCircle,
  saving: Upload,
  completed: CheckCircle,
  error: AlertTriangle
};

/**
 * Componente para exibir status de processamento individual
 */
export function ProcessingStatus({ taskId, showDetails = true, compact = false }: ProcessingStatusProps) {
  const { task, loading, error, cancelTask, retryTask } = useProcessingStatus(taskId);

  if (loading) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !task) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Erro ao carregar status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[task.status];
  const StatusIcon = config.icon;
  const StageIcon = stageIcons[task.current_stage as keyof typeof stageIcons] || Clock;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        <div className={`p-2 rounded-full ${config.bgColor}`}>
          <StatusIcon className={`h-4 w-4 ${config.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{task.file_name}</span>
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          
          {task.status === 'processing' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{task.stage_message}</span>
                <span>{task.progress_percentage}%</span>
              </div>
              <Progress value={task.progress_percentage} className="h-1" />
            </div>
          )}
          
          {task.status === 'failed' && task.error_message && (
            <p className="text-xs text-red-600 truncate">{task.error_message}</p>
          )}
        </div>

        {(task.status === 'failed' || task.status === 'cancelled') && (
          <Button
            size="sm"
            variant="outline"
            onClick={retryTask}
            className="h-8 px-2"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}

        {task.status === 'processing' && (
          <Button
            size="sm"
            variant="outline"
            onClick={cancelTask}
            className="h-8 px-2"
          >
            <Pause className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${config.borderColor} ${config.bgColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-white/50`}>
              <StatusIcon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{task.file_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(task.file_size)} • {config.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
            
            {task.priority !== 'normal' && (
              <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}>
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progresso para tarefas em processamento */}
        {task.status === 'processing' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StageIcon className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="font-medium text-sm">{task.stage_message}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{task.progress_percentage}%</span>
              </div>
              <Progress 
                value={task.progress_percentage} 
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Erro para tarefas falhadas */}
        {task.status === 'failed' && task.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 text-sm">Erro no processamento</p>
                <p className="text-red-700 text-sm mt-1">{task.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Informações de tempo */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Criado em:</span>
            <p className="font-medium">
              {new Date(task.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
          
          {task.completed_at && (
            <div>
              <span className="text-muted-foreground">Concluído em:</span>
              <p className="font-medium">
                {new Date(task.completed_at).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>

        {/* Tentativas */}
        {task.retry_count > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Tentativas:</span>
            <span className="ml-2 font-medium">
              {task.retry_count} de {task.max_retries}
            </span>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          {(task.status === 'failed' || task.status === 'cancelled') && (
            <Button
              size="sm"
              variant="outline"
              onClick={retryTask}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          )}

          {task.status === 'processing' && (
            <Button
              size="sm"
              variant="outline"
              onClick={cancelTask}
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>

        {/* Logs detalhados (collapsible) */}
        {showDetails && task.processing_logs && task.processing_logs.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Ver Logs Detalhados ({task.processing_logs.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-muted/30 rounded border">
                {task.processing_logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <span className={`ml-2 font-medium ${
                      log.level === 'ERROR' ? 'text-red-600' :
                      log.level === 'SUCCESS' ? 'text-green-600' :
                      log.level === 'WARN' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      [{log.level}]
                    </span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export default ProcessingStatus;
