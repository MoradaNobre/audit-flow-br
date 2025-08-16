/**
 * Template de Relatório de Auditoria
 * Template padronizado com seções definidas para relatórios
 * Fase 2.2 - Relatórios Básicos
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ValidationResults } from './ValidationResults';
import { FinancialCharts, type FinancialData } from './FinancialCharts';
import { 
  FileText, 
  Calendar, 
  Building2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Download,
  Printer,
  Share2,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import type { ValidationResult } from '@/lib/financialValidation';

export interface RelatorioData {
  // Informações básicas
  id: string;
  prestacaoId: string;
  condominio: {
    nome: string;
    cnpj: string;
    endereco?: string;
  };
  periodo: {
    mes: number;
    ano: number;
    dataInicio: string;
    dataFim: string;
  };
  
  // Dados financeiros
  financialData: FinancialData;
  
  // Resultados da validação
  validationResult: ValidationResult;
  
  // Metadados
  geradoEm: string;
  geradoPor: string;
  versao: string;
  
  // Inconsistências encontradas
  inconsistencias: Array<{
    tipo: string;
    descricao: string;
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    recomendacao: string;
  }>;
  
  // Observações
  observacoes?: string;
  conclusao?: string;
}

interface RelatorioTemplateProps {
  data: RelatorioData;
  onExportPDF?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  className?: string;
}

export const RelatorioTemplate: React.FC<RelatorioTemplateProps> = ({
  data,
  onExportPDF,
  onPrint,
  onShare,
  className = ''
}) => {
  // Formatadores
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPeriod = (mes: number, ano: number) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[mes - 1]} de ${ano}`;
  };

  // Cor da severidade
  const getSeverityColor = (severidade: string) => {
    switch (severidade) {
      case 'critica': return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'alta': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'media': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'baixa': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getSeverityIcon = (severidade: string) => {
    switch (severidade) {
      case 'critica': return <XCircle className="h-4 w-4" />;
      case 'alta': return <AlertTriangle className="h-4 w-4" />;
      case 'media': return <AlertTriangle className="h-4 w-4" />;
      case 'baixa': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Status geral baseado no score
  const getOverallStatus = () => {
    const score = data.validationResult.score;
    if (score >= 95) return { status: 'Excelente', color: 'text-green-600', icon: CheckCircle };
    if (score >= 85) return { status: 'Bom', color: 'text-blue-600', icon: CheckCircle };
    if (score >= 70) return { status: 'Regular', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'Crítico', color: 'text-red-600', icon: XCircle };
  };

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`} id="relatorio-content">
      {/* Cabeçalho do Relatório */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Relatório de Auditoria Financeira
              </CardTitle>
              <CardDescription className="text-base">
                Análise da prestação de contas - {formatPeriod(data.periodo.mes, data.periodo.ano)}
              </CardDescription>
            </div>
            
            {/* Ações */}
            <div className="flex gap-2">
              {onExportPDF && (
                <Button variant="outline" size="sm" onClick={onExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              )}
              {onPrint && (
                <Button variant="outline" size="sm" onClick={onPrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              )}
              {onShare && (
                <Button variant="outline" size="sm" onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Condomínio</p>
              <p className="font-medium">{data.condominio.nome}</p>
              <p className="text-xs text-muted-foreground">{data.condominio.cnpj}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium">{formatPeriod(data.periodo.mes, data.periodo.ano)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(data.periodo.dataInicio)} a {formatDate(data.periodo.dataFim)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status Geral</p>
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 ${overallStatus.color}`} />
                <span className={`font-medium ${overallStatus.color}`}>
                  {overallStatus.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Score: {data.validationResult.score}%
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Gerado em</p>
              <p className="font-medium">{formatDate(data.geradoEm)}</p>
              <p className="text-xs text-muted-foreground">
                Versão {data.versao}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Executivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-muted-foreground">Saldo Anterior</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(data.financialData.saldoAnterior)}
              </p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(data.financialData.receitas)}
              </p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-red-600 rotate-180" />
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(data.financialData.despesas)}
              </p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-muted-foreground">Saldo Final</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(data.financialData.saldoFinal)}
              </p>
            </div>
          </div>
          
          {/* Conclusão */}
          {data.conclusao && (
            <div className="p-4 rounded-lg bg-muted/30 border-l-4 border-primary">
              <h4 className="font-medium mb-2">Conclusão</h4>
              <p className="text-sm text-muted-foreground">{data.conclusao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados da Validação */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Validação</CardTitle>
          <CardDescription>
            Resultados detalhados das verificações matemáticas e de consistência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ValidationResults result={data.validationResult} />
        </CardContent>
      </Card>

      {/* Gráficos Financeiros */}
      <FinancialCharts data={data.financialData} />

      {/* Inconsistências Encontradas */}
      {data.inconsistencias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Inconsistências Encontradas
            </CardTitle>
            <CardDescription>
              Lista detalhada de problemas identificados e recomendações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.inconsistencias.map((inconsistencia, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getSeverityIcon(inconsistencia.severidade)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{inconsistencia.tipo}</h4>
                        <Badge className={getSeverityColor(inconsistencia.severidade)}>
                          {inconsistencia.severidade.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {inconsistencia.descricao}
                      </p>
                      
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500">
                        <p className="text-sm">
                          <strong>Recomendação:</strong> {inconsistencia.recomendacao}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {data.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm whitespace-pre-wrap">{data.observacoes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rodapé */}
      <Card className="border-t-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <p>Relatório gerado automaticamente pelo sistema Audit Flow BR</p>
              <p>Gerado por: {data.geradoPor} em {formatDate(data.geradoEm)}</p>
            </div>
            <div className="text-right">
              <p>ID do Relatório: {data.id}</p>
              <p>Prestação: {data.prestacaoId}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
