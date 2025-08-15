import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Eye, BarChart3, Building2, AlertCircle, Download, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { UploadModal } from '@/components/UploadModal';
import { AdminActions } from '@/components/AdminActions';
import { useCondominio } from '@/hooks/useCondominios';
import { usePrestacoes } from '@/hooks/usePrestacoes';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type StatusType = 'pendente' | 'processando' | 'concluido' | 'erro';

const getStatusColor = (status: StatusType) => {
  switch (status) {
    case 'pendente':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'processando':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'concluido':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'erro':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

const getStatusText = (status: StatusType) => {
  switch (status) {
    case 'pendente':
      return 'Pendente';
    case 'processando':
      return 'Processando';
    case 'concluido':
      return 'Concluído';
    case 'erro':
      return 'Erro';
    default:
      return 'Desconhecido';
  }
};

export default function Condominio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Estados para filtros e ordenação
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'month' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch data with React Query
  const { data: condominio, isLoading: condominioLoading, error: condominioError } = useCondominio(id || '');
  const { data: prestacoes, isLoading: prestacoesLoading } = usePrestacoes(id);

  // Filtrar e ordenar prestações
  const filteredAndSortedPrestacoes = useMemo(() => {
    if (!prestacoes) return [];

    let filtered = prestacoes.filter((prestacao) => {
      const matchesSearch = searchTerm === '' || 
        `${prestacao.mes_referencia}/${prestacao.ano_referencia}`.includes(searchTerm) ||
        prestacao.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || prestacao.status_analise === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'month':
          comparison = (a.ano_referencia * 12 + a.mes_referencia) - (b.ano_referencia * 12 + b.mes_referencia);
          break;
        case 'status':
          comparison = a.status_analise.localeCompare(b.status_analise);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [prestacoes, searchTerm, statusFilter, sortBy, sortOrder]);

  if (condominioError || (!condominioLoading && !condominio)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Condomínio não encontrado</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleRowClick = async (prestacao: any) => {
    if (prestacao.status_analise === 'concluido') {
      try {
        // Buscar o relatório correspondente à prestação
        const { data: relatorio, error } = await supabase
          .from('relatorios_auditoria')
          .select('id')
          .eq('prestacao_id', prestacao.id)
          .maybeSingle();
          
        if (error) {
          console.error('Erro ao buscar relatório:', error);
          return;
        }
        
        if (relatorio) {
          navigate(`/relatorio/${relatorio.id}`);
        } else {
          console.log('Relatório não encontrado para prestação:', prestacao.id);
        }
      } catch (error) {
        console.error('Erro ao buscar relatório:', error);
      }
    }
  };

  const handleSort = (field: 'date' | 'month' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'date' | 'month' | 'status' }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const downloadPDF = async (prestacao: any) => {
    if (prestacao.arquivo_url) {
      try {
        // If it's already a full URL, use it directly
        if (prestacao.arquivo_url.startsWith('http')) {
          window.open(prestacao.arquivo_url, '_blank');
          return;
        }
        
        // Otherwise, get the public URL from Supabase Storage
        const { data } = supabase.storage
          .from('prestacoes-pdf')
          .getPublicUrl(prestacao.arquivo_url);
        
        if (data?.publicUrl) {
          window.open(data.publicUrl, '_blank');
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível acessar o arquivo PDF.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Erro ao baixar PDF:', error);
        toast({
          title: "Erro",
          description: "Erro ao baixar o arquivo PDF.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              {condominioLoading ? (
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32 mt-1" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{condominio?.nome}</h1>
                    <p className="text-sm text-muted-foreground">
                      {condominio?.cnpj ? `CNPJ: ${condominio.cnpj}` : 'CNPJ não informado'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
              <ThemeToggle />
              <Button 
                onClick={() => setUploadModalOpen(true)}
                className="gap-2"
                disabled={!condominio}
              >
                <Upload className="h-4 w-4" />
                Novo Upload
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Relatórios</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {prestacoesLoading ? '-' : prestacoes?.length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {prestacoesLoading ? '-' : prestacoes?.filter(p => p.status_analise === 'concluido').length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Processamento</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {prestacoesLoading ? '-' : prestacoes?.filter(p => p.status_analise === 'processando').length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {prestacoesLoading ? '-' : prestacoes?.filter(p => p.status_analise === 'pendente').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por mês/ano ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de prestações de contas */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Prestações de Contas</CardTitle>
            <CardDescription>
              Histórico de todas as prestações de contas enviadas para análise. 
              Mostrando {filteredAndSortedPrestacoes.length} de {prestacoes?.length || 0} registros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('month')}
                  >
                    <div className="flex items-center gap-2">
                      Mês/Ano de Referência
                      <SortIcon field="month" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Data de Upload
                      <SortIcon field="date" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status da Análise
                      <SortIcon field="status" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prestacoesLoading ? (
                  // Loading rows
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAndSortedPrestacoes && filteredAndSortedPrestacoes.length > 0 ? (
                  filteredAndSortedPrestacoes.map((prestacao) => (
                    <TableRow 
                      key={prestacao.id}
                      className={`transition-colors ${
                        prestacao.status_analise === 'concluido' 
                          ? 'cursor-pointer hover:bg-muted/50' 
                          : ''
                      }`}
                      onClick={() => handleRowClick(prestacao)}
                    >
                      <TableCell className="font-medium">
                        {prestacao.mes_referencia.toString().padStart(2, '0')}/{prestacao.ano_referencia}
                      </TableCell>
                      <TableCell>
                        {new Date(prestacao.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(prestacao.status_analise)}>
                          {getStatusText(prestacao.status_analise)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          {prestacao.arquivo_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadPDF(prestacao);
                              }}
                            >
                              <Download className="h-4 w-4" />
                              PDF
                            </Button>
                          )}
                           {prestacao.status_analise === 'concluido' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const { data: relatorio, error } = await supabase
                                    .from('relatorios_auditoria')
                                    .select('id')
                                    .eq('prestacao_id', prestacao.id)
                                    .maybeSingle();
                                    
                                  if (error || !relatorio) {
                                    console.error('Relatório não encontrado');
                                    return;
                                  }
                                  
                                  navigate(`/relatorio/${relatorio.id}`);
                                } catch (error) {
                                  console.error('Erro ao buscar relatório:', error);
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              Ver Relatório
                            </Button>
                          )}
                          <AdminActions 
                            type="prestacao"
                            id={prestacao.id}
                            name={`${prestacao.mes_referencia}/${prestacao.ano_referencia}`}
                            onAnalyze={() => {
                              window.location.reload();
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <p>Nenhuma prestação de contas encontrada</p>
                        <p className="text-sm">Faça o primeiro upload para começar</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <UploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
        condominios={condominio ? [condominio] : []}
      />
    </div>
  );
}