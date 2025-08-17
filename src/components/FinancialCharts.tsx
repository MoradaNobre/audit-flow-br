/**
 * Componente de Gráficos Financeiros
 * Gráficos simples para visualização de dados da prestação de contas
 * Fase 2.2 - Relatórios Básicos
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react';

export interface FinancialData {
  saldoAnterior: number;
  receitas: number;
  despesas: number;
  saldoFinal: number;
  categorias: Array<{
    nome: string;
    valor: number;
    percentual: number;
    cor?: string;
  }>;
  comparacao?: {
    mesAnterior: {
      receitas: number;
      despesas: number;
      saldo: number;
    };
  };
}

interface FinancialChartsProps {
  data: FinancialData;
  className?: string;
}

// Cores para os gráficos
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
  '#00ff00', '#ff00ff', '#00ffff', '#ff0000',
  '#0088fe', '#00c49f', '#ffbb28', '#ff8042'
];

export const FinancialCharts: React.FC<FinancialChartsProps> = ({ data, className = '' }) => {
  // Dados para gráfico de barras (Receitas vs Despesas)
  const barChartData = [
    {
      name: 'Saldo Anterior',
      valor: data.saldoAnterior,
      tipo: 'saldo'
    },
    {
      name: 'Receitas',
      valor: data.receitas,
      tipo: 'receita'
    },
    {
      name: 'Despesas',
      valor: data.despesas,
      tipo: 'despesa'
    },
    {
      name: 'Saldo Final',
      valor: data.saldoFinal,
      tipo: 'saldo'
    }
  ];

  // Dados para gráfico de pizza (Categorias)
  const pieChartData = data.categorias.map((categoria, index) => ({
    name: categoria.nome,
    value: categoria.valor,
    percentual: categoria.percentual,
    color: categoria.cor || COLORS[index % COLORS.length]
  }));

  // Dados para comparação (se disponível)
  const comparisonData = data.comparacao ? [
    {
      periodo: 'Mês Anterior',
      receitas: data.comparacao.mesAnterior.receitas,
      despesas: data.comparacao.mesAnterior.despesas,
      saldo: data.comparacao.mesAnterior.saldo
    },
    {
      periodo: 'Mês Atual',
      receitas: data.receitas,
      despesas: data.despesas,
      saldo: data.saldoFinal
    }
  ] : null;

  // Formatador de valores em reais
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Tooltip para pizza
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-primary">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{data.percentual.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Cor das barras baseada no tipo
  const getBarColor = (tipo: string) => {
    switch (tipo) {
      case 'receita': return '#22c55e'; // Verde
      case 'despesa': return '#ef4444'; // Vermelho
      case 'saldo': return '#3b82f6'; // Azul
      default: return '#6b7280'; // Cinza
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Resumo Financeiro - Gráfico de Barras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
          <CardDescription>
            Visão geral dos valores da prestação de contas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="valor" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Categorias - Gráfico de Pizza */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribuição por Categorias
          </CardTitle>
          <CardDescription>
            Breakdown das despesas por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentual }) => `${name}: ${percentual.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda e Valores */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Detalhamento por Categoria
              </h4>
              {pieChartData.map((categoria, index) => (
                <div key={categoria.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: categoria.color }}
                    />
                    <span className="text-sm font-medium">{categoria.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(categoria.value)}</p>
                    <p className="text-xs text-muted-foreground">{categoria.percentual.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparação com Período Anterior (se disponível) */}
      {comparisonData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Comparação com Período Anterior
            </CardTitle>
            <CardDescription>
              Evolução dos indicadores financeiros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelStyle={{ color: 'var(--foreground)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="receitas" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Receitas"
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Despesas"
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Saldo Final"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Indicadores de Saúde Financeira */}
      <Card>
        <CardHeader>
          <CardTitle>Indicadores de Saúde Financeira</CardTitle>
          <CardDescription>
            Métricas importantes para análise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Taxa de Crescimento */}
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Variação do Saldo</p>
                  <p className="text-2xl font-bold">
                    {((data.saldoFinal - data.saldoAnterior) / data.saldoAnterior * 100).toFixed(1)}%
                  </p>
                </div>
                {data.saldoFinal > data.saldoAnterior ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </div>

            {/* Taxa de Despesas */}
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">% Despesas/Receitas</p>
                  <p className="text-2xl font-bold">
                    {(data.despesas / data.receitas * 100).toFixed(1)}%
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            {/* Resultado Líquido */}
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.receitas - data.despesas)}
                  </p>
                </div>
                {(data.receitas - data.despesas) > 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
