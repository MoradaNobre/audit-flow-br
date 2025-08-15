import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, Eye, BarChart3, Building2 } from 'lucide-react';
import { UploadModal } from '@/components/UploadModal';

type StatusType = 'pendente' | 'processando' | 'concluido' | 'erro';

interface PrestacaoContas {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  dataUpload: string;
  status: StatusType;
}

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

const mockPrestacoes: PrestacaoContas[] = [
  {
    id: '1',
    mesReferencia: 11,
    anoReferencia: 2024,
    dataUpload: '2024-12-01',
    status: 'concluido'
  },
  {
    id: '2',
    mesReferencia: 10,
    anoReferencia: 2024,
    dataUpload: '2024-11-01',
    status: 'concluido'
  },
  {
    id: '3',
    mesReferencia: 9,
    anoReferencia: 2024,
    dataUpload: '2024-10-01',
    status: 'processando'
  },
  {
    id: '4',
    mesReferencia: 8,
    anoReferencia: 2024,
    dataUpload: '2024-09-01',
    status: 'pendente'
  }
];

const mockCondominios = {
  '1': { nome: 'Residencial Jardim das Flores', cnpj: '12.345.678/0001-90' },
  '2': { nome: 'Condomínio Bella Vista', cnpj: '98.765.432/0001-10' },
  '3': { nome: 'Edifício Central Park', cnpj: '11.222.333/0001-44' }
};

export default function Condominio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const condominio = mockCondominios[id as keyof typeof mockCondominios];

  if (!condominio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Condomínio não encontrado</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleRowClick = (prestacao: PrestacaoContas) => {
    if (prestacao.status === 'concluido') {
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
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{condominio.nome}</h1>
                  <p className="text-sm text-muted-foreground">CNPJ: {condominio.cnpj}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
              <Button 
                onClick={() => setUploadModalOpen(true)}
                className="gap-2"
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
              <div className="text-2xl font-bold text-primary">{mockPrestacoes.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {mockPrestacoes.filter(p => p.status === 'concluido').length}
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
                {mockPrestacoes.filter(p => p.status === 'processando').length}
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
                {mockPrestacoes.filter(p => p.status === 'pendente').length}
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
                {mockPrestacoes.map((prestacao) => (
                  <TableRow 
                    key={prestacao.id}
                    className={`transition-colors ${
                      prestacao.status === 'concluido' 
                        ? 'cursor-pointer hover:bg-muted/50' 
                        : ''
                    }`}
                    onClick={() => handleRowClick(prestacao)}
                  >
                    <TableCell className="font-medium">
                      {prestacao.mesReferencia.toString().padStart(2, '0')}/{prestacao.anoReferencia}
                    </TableCell>
                    <TableCell>
                      {new Date(prestacao.dataUpload).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(prestacao.status)}>
                        {getStatusText(prestacao.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {prestacao.status === 'concluido' && (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <UploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
        condominioId={id || ''}
        condominioNome={condominio.nome}
      />
    </div>
  );
}