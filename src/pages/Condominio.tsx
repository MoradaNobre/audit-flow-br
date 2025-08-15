import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, Eye, BarChart3, Building2, AlertCircle } from 'lucide-react';
import { UploadModal } from '@/components/UploadModal';
import { useCondominio } from '@/hooks/useCondominios';
import { usePrestacoes } from '@/hooks/usePrestacoes';

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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Fetch data with React Query
  const { data: condominio, isLoading: condominioLoading, error: condominioError } = useCondominio(id || '');
  const { data: prestacoes, isLoading: prestacoesLoading } = usePrestacoes(id);

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

  const handleRowClick = (prestacao: any) => {
    if (prestacao.status_analise === 'concluido') {
      navigate(`/relatorio/${prestacao.id}`);
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

        {/* Tabela de prestações de contas */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">Prestações de Contas</CardTitle>
            <CardDescription>
              Histórico de todas as prestações de contas enviadas para análise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano de Referência</TableHead>
                  <TableHead>Data de Upload</TableHead>
                  <TableHead>Status da Análise</TableHead>
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
                ) : prestacoes && prestacoes.length > 0 ? (
                  prestacoes.map((prestacao) => (
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
                        {prestacao.status_analise === 'concluido' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/relatorio/${prestacao.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Ver Relatório
                          </Button>
                        )}
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