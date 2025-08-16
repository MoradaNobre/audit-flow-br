import React, { useState } from 'react';
import { 
  Clock, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Filter,
  Search,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserProcessingTasks, useQueueStats, ProcessingStatus as ProcessingStatusType } from '@/hooks/useProcessingStatus';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { formatFileSize } from '@/lib/fileValidation';

/**
 * Componente para estatísticas da fila
 */
function QueueStatsCards() {
  const { stats, loading, refetch } = useQueueStats();

  const statsCards = [
    {
      title: 'Aguardando',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Processando',
      value: stats.processing,
      icon: Upload,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Concluídos',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Falharam',
      value: stats.failed,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className={`${stat.borderColor} ${stat.bgColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Componente principal da fila de processamento
 */
export function ProcessingQueue() {
  const { tasks, loading, error, refetch } = useUserProcessingTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcessingStatusType | 'all'>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'active' && ['pending', 'processing'].includes(task.status)) ||
      (activeTab === 'completed' && task.status === 'completed') ||
      (activeTab === 'failed' && ['failed', 'cancelled'].includes(task.status));
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  // Agrupar por status para as abas
  const tasksByStatus = {
    all: tasks,
    active: tasks.filter(t => ['pending', 'processing'].includes(t.status)),
    completed: tasks.filter(t => t.status === 'completed'),
    failed: tasks.filter(t => ['failed', 'cancelled'].includes(t.status))
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <span>Erro ao carregar fila de processamento</span>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <QueueStatsCards />

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Fila de Processamento
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do arquivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProcessingStatusType | 'all')}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Aguardando</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                Todas
                <Badge variant="secondary" className="text-xs">
                  {tasksByStatus.all.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                Ativas
                <Badge variant="secondary" className="text-xs">
                  {tasksByStatus.active.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                Concluídas
                <Badge variant="secondary" className="text-xs">
                  {tasksByStatus.completed.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="failed" className="flex items-center gap-2">
                Falharam
                <Badge variant="secondary" className="text-xs">
                  {tasksByStatus.failed.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {/* Lista de tarefas */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="text-muted-foreground">Carregando tarefas...</span>
                  </div>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="font-medium text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Nenhuma tarefa encontrada' 
                        : 'Nenhuma tarefa na fila'
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Tente ajustar os filtros de busca'
                        : 'Faça upload de um arquivo para começar'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => (
                    <ProcessingStatus
                      key={task.id}
                      taskId={task.id}
                      compact={true}
                      showDetails={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProcessingQueue;
