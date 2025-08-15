import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileText, AlertTriangle, DollarSign, TrendingUp, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsePieChart, Cell, Pie } from 'recharts';

interface InconsistenciaType {
  id: string;
  descricao: string;
  tipo: 'financeira' | 'conformidade';
  nivelCriticidade: 'baixa' | 'media' | 'alta';
}

const mockRelatorio = {
  id: '1',
  condominioNome: 'Residencial Jardim das Flores',
  mesReferencia: 11,
  anoReferencia: 2024,
  resumoGeral: {
    balancoTotal: 45750.80,
    totalDespesas: 42300.50,
    maiorGasto: { categoria: 'Manutenção Predial', valor: 15200.00 },
    saldoFinal: 3450.30
  },
  distribuicaoDespesas: [
    { categoria: 'Manutenção Predial', valor: 15200, color: '#8884d8' },
    { categoria: 'Limpeza', valor: 8500, color: '#82ca9d' },
    { categoria: 'Segurança', valor: 7200, color: '#ffc658' },
    { categoria: 'Administração', valor: 5800, color: '#ff7300' },
    { categoria: 'Energia Elétrica', valor: 3200, color: '#00ff88' },
    { categoria: 'Outros', valor: 2400.50, color: '#8dd1e1' }
  ],
  inconsistencias: [
    {
      id: '1',
      descricao: 'Valor de despesa com manutenção 15% acima da média histórica',
      tipo: 'financeira' as const,
      nivelCriticidade: 'media' as const
    },
    {
      id: '2', 
      descricao: 'Ausência de três recibos de prestadores de serviços',
      tipo: 'conformidade' as const,
      nivelCriticidade: 'alta' as const
    },
    {
      id: '3',
      descricao: 'Pequena divergência na categoria "Outros" (R$ 50,30)',
      tipo: 'financeira' as const,
      nivelCriticidade: 'baixa' as const
    }
  ]
};

const getCriticidadeColor = (nivel: string) => {
  switch (nivel) {
    case 'baixa':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'media':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'alta':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case 'financeira':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'conformidade':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

export default function Relatorio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!mockRelatorio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Relatório não encontrado</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Relatório de Auditoria
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {mockRelatorio.condominioNome} - {mockRelatorio.mesReferencia.toString().padStart(2, '0')}/{mockRelatorio.anoReferencia}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Relatório Gerado</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Seção 1: Resumo Geral */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Resumo Geral</h2>
            <p className="text-muted-foreground">Principais indicadores financeiros extraídos pela análise automatizada</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balanço Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {mockRelatorio.resumoGeral.balancoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Receitas totais do período
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R$ {mockRelatorio.resumoGeral.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gastos totais do período
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Maior Gasto</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  R$ {mockRelatorio.resumoGeral.maiorGasto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mockRelatorio.resumoGeral.maiorGasto.categoria}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Final</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  R$ {mockRelatorio.resumoGeral.saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Resultado do período
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Seção 2: Análise Detalhada */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Análise Detalhada</h2>
            <p className="text-muted-foreground">Distribuição das despesas por categoria</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockRelatorio.distribuicaoDespesas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="categoria" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                    />
                    <Bar dataKey="valor" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Distribuição Percentual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsePieChart>
                    <Pie
                      data={mockRelatorio.distribuicaoDespesas}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="valor"
                      label={({ categoria, percent }) => `${categoria}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {mockRelatorio.distribuicaoDespesas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                    />
                  </RechartsePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Seção 3: Inconsistências Encontradas */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Inconsistências Encontradas</h2>
            <p className="text-muted-foreground">Ressalvas e pontos de atenção identificados pela auditoria automatizada</p>
          </div>

          <div className="space-y-4">
            {mockRelatorio.inconsistencias.map((inconsistencia) => (
              <Alert key={inconsistencia.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <div className="flex items-start justify-between">
                    <p className="text-foreground flex-1 pr-4">
                      {inconsistencia.descricao}
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge className={getTipoColor(inconsistencia.tipo)}>
                        {inconsistencia.tipo === 'financeira' ? 'Financeira' : 'Conformidade'}
                      </Badge>
                      <Badge className={getCriticidadeColor(inconsistencia.nivelCriticidade)}>
                        {inconsistencia.nivelCriticidade === 'baixa' ? 'Baixa' :
                         inconsistencia.nivelCriticidade === 'media' ? 'Média' : 'Alta'}
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>

          {mockRelatorio.inconsistencias.length === 0 && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="text-center py-8">
                <div className="text-green-600 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">Nenhuma Inconsistência Encontrada</h3>
                <p className="text-muted-foreground">
                  A prestação de contas está em conformidade com os padrões analisados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}