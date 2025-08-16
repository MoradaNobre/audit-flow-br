/**
 * Componente para exibir resultados de validação financeira
 * Mostra erros, warnings e estatísticas da análise
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  TrendingUp,
  Calculator,
  FileText,
  Clock
} from 'lucide-react';
import { ValidationResult, ErrorType, WarningType } from '@/lib/financialValidation';
import { analysisUtils } from '@/hooks/useFinancialValidation';
import { cn } from '@/lib/utils';

interface ValidationResultsProps {
  result: ValidationResult;
  processingTime?: number;
  className?: string;
}

export function ValidationResults({ result, processingTime, className }: ValidationResultsProps) {
  const { summary, errors, warnings, score } = result;
  const errorsByType = analysisUtils.categorizeErrors(errors);
  const recommendations = analysisUtils.generateRecommendations(result);
  const healthColor = analysisUtils.getHealthColor(summary?.overallHealth || 'fair');

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header com Score e Status Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resultado da Validação Financeira
            </span>
            {processingTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {processingTime}ms
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Principal */}
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold">
              <span className={healthColor}>{score}%</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Status: <span className={cn("font-medium", healthColor)}>
                {(summary?.overallHealth || 'fair').toUpperCase()}
              </span>
            </div>
            <Progress value={score} className="w-full h-2" />
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {summary?.passedChecks || 0}
              </div>
              <div className="text-xs text-muted-foreground">Aprovados</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-red-600">
                {summary?.failedChecks || 0}
              </div>
              <div className="text-xs text-muted-foreground">Reprovados</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-yellow-600">
                {warnings?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Avisos</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {summary?.totalChecks || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erros Críticos */}
      {errorsByType.critical.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erros Críticos ({errorsByType.critical.length})</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {errorsByType.critical.map((error, index) => (
              <div key={index} className="text-sm">
                <strong>{getErrorTypeLabel(error.type)}:</strong> {error.message}
                {error.expectedValue !== undefined && error.actualValue !== undefined && (
                  <div className="text-xs mt-1 opacity-80">
                    Esperado: {formatValue(error.expectedValue)} | 
                    Atual: {formatValue(error.actualValue)}
                    {error.difference && ` | Diferença: ${formatValue(error.difference)}`}
                  </div>
                )}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Erros de Alta Prioridade */}
      {errorsByType.high.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erros de Alta Prioridade ({errorsByType.high.length})</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {errorsByType.high.map((error, index) => (
              <div key={index} className="text-sm">
                <strong>{getErrorTypeLabel(error.type)}:</strong> {error.message}
                {error.field && (
                  <div className="text-xs mt-1 opacity-80">Campo: {error.field}</div>
                )}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Avisos */}
      {(warnings?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Avisos ({warnings?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(warnings || []).map((warning, index) => (
                <div key={index} className="border-l-4 border-yellow-400 pl-4 py-2">
                  <div className="font-medium text-sm">
                    {getWarningTypeLabel(warning.type)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {warning.message}
                  </div>
                  {warning.suggestion && (
                    <div className="text-xs text-blue-600 mt-1">
                      💡 {warning.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erros Médios e Baixos (se existirem) */}
      {(errorsByType.medium.length > 0 || errorsByType.low.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Outros Problemas Identificados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorsByType.medium.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-600 mb-2">
                  Prioridade Média ({errorsByType.medium.length})
                </h4>
                <div className="space-y-2">
                  {errorsByType.medium.map((error, index) => (
                    <div key={index} className="text-sm border-l-4 border-orange-400 pl-3 py-1">
                      <strong>{getErrorTypeLabel(error.type)}:</strong> {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorsByType.low.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-600 mb-2">
                  Prioridade Baixa ({errorsByType.low.length})
                </h4>
                <div className="space-y-2">
                  {errorsByType.low.map((error, index) => (
                    <div key={index} className="text-sm border-l-4 border-blue-400 pl-3 py-1">
                      <strong>{getErrorTypeLabel(error.type)}:</strong> {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recomendações */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <TrendingUp className="h-4 w-4" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resumo Final */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Resumo da Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {analysisUtils.generateSummary(result)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Utilitários para labels
function getErrorTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    [ErrorType.BALANCE_MISMATCH]: 'Inconsistência no Balanço',
    [ErrorType.NEGATIVE_INVALID]: 'Valor Negativo Inválido',
    [ErrorType.PERCENTAGE_INVALID]: 'Percentual Inválido',
    [ErrorType.DATE_INCONSISTENCY]: 'Inconsistência de Data',
    [ErrorType.CALCULATION_ERROR]: 'Erro de Cálculo',
    [ErrorType.MISSING_DATA]: 'Dados Ausentes',
    [ErrorType.OUTLIER_DETECTED]: 'Valor Atípico',
    [ErrorType.CNPJ_INVALID]: 'CNPJ Inválido',
  };
  return labels[type] || type;
}

function getWarningTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    [WarningType.UNUSUAL_VARIATION]: 'Variação Incomum',
    [WarningType.HIGH_EXPENSE]: 'Despesa Elevada',
    [WarningType.LOW_RESERVE]: 'Reserva Baixa',
    [WarningType.CATEGORY_IMBALANCE]: 'Desequilíbrio de Categoria',
    [WarningType.DATE_PROXIMITY]: 'Proximidade de Data',
  };
  return labels[type] || type;
}

function formatValue(value: number): string {
  if (typeof value !== 'number') return String(value);
  
  // Se parece com um valor monetário (maior que 1)
  if (Math.abs(value) >= 1) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  // Se parece com um percentual (menor que 1)
  return `${(value * 100).toFixed(2)}%`;
}
