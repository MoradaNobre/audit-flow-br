/**
 * Hook para validação financeira de prestações de contas
 * Versão simplificada para Fase 2 - Análise Básica e Validação
 */

import { useMutation } from '@tanstack/react-query';
import { 
  financialValidator, 
  ValidationResult, 
  ErrorType, 
  WarningType 
} from '@/lib/financialValidation';
import { toast } from 'sonner';

export interface AnalysisResult {
  prestacaoId: string;
  validationResult: ValidationResult;
  analyzedAt: string;
  processingTime: number;
}

/**
 * Hook principal para executar validação financeira
 */
export function useFinancialValidation() {
  const validateFinancialData = useMutation({
    mutationFn: async (data: {
      prestacaoId: string;
      extractedData: any;
    }): Promise<AnalysisResult> => {
      const startTime = Date.now();

      try {
        console.log('🔍 Iniciando validação financeira para:', data.prestacaoId);
        
        // Executar validação usando o sistema criado
        const validationResult = await financialValidator.validatePrestacao(data.extractedData);
        const processingTime = Date.now() - startTime;

        console.log('✅ Validação concluída:', {
          score: validationResult.score,
          errors: validationResult.errors.length,
          warnings: validationResult.warnings.length,
          health: validationResult.summary.overallHealth
        });

        return {
          prestacaoId: data.prestacaoId,
          validationResult,
          analyzedAt: new Date().toISOString(),
          processingTime
        };

      } catch (error) {
        console.error('❌ Erro durante validação financeira:', error);
        throw new Error(`Falha na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    },
    onSuccess: (result) => {
      const { validationResult } = result;
      const criticalErrors = validationResult.errors.filter(e => e.severity === 'critical').length;
      const highErrors = validationResult.errors.filter(e => e.severity === 'high').length;
      
      if (criticalErrors === 0 && highErrors === 0) {
        toast.success(`✅ Validação concluída! Score: ${validationResult.score}%`);
      } else if (criticalErrors > 0) {
        toast.error(`❌ ${criticalErrors} erro(s) crítico(s) encontrado(s)`);
      } else {
        toast.warning(`⚠️ ${highErrors} erro(s) de alta prioridade encontrado(s)`);
      }
    },
    onError: (error) => {
      console.error('Erro na validação:', error);
      toast.error('❌ Erro ao executar validação financeira');
    }
  });

  return {
    validateFinancialData: validateFinancialData.mutate,
    validateFinancialDataAsync: validateFinancialData.mutateAsync,
    isValidating: validateFinancialData.isPending,
    error: validateFinancialData.error,
    result: validateFinancialData.data,
  };
}

/**
 * Hook para análise rápida de dados extraídos
 */
export function useQuickAnalysis() {
  return useMutation({
    mutationFn: async (extractedData: any): Promise<ValidationResult> => {
      console.log('🚀 Executando análise rápida...');
      
      const result = await financialValidator.validatePrestacao(extractedData);
      
      console.log('📊 Resultado da análise rápida:', {
        score: result.score,
        health: result.summary.overallHealth,
        totalChecks: result.summary.totalChecks,
        passedChecks: result.summary.passedChecks
      });
      
      return result;
    },
    onError: (error) => {
      console.error('Erro na análise rápida:', error);
      toast.error('Erro ao executar análise rápida');
    }
  });
}

/**
 * Utilitários para análise de resultados
 */
export const analysisUtils = {
  /**
   * Categoriza erros por severidade
   */
  categorizeErrors: (errors: ValidationResult['errors']) => {
    const safeErrors = errors || [];
    return {
      critical: safeErrors.filter(e => e.severity === 'critical'),
      high: safeErrors.filter(e => e.severity === 'high'),
      medium: safeErrors.filter(e => e.severity === 'medium'),
      low: safeErrors.filter(e => e.severity === 'low'),
    };
  },

  /**
   * Gera resumo textual da validação
   */
  generateSummary: (result: ValidationResult): string => {
    const { summary, errors = [], warnings = [] } = result;
    const errorsByType = analysisUtils.categorizeErrors(errors);
    
    let summaryText = `Score: ${result.score}% (${summary?.overallHealth?.toUpperCase() || 'N/A'})\n`;
    summaryText += `Verificações: ${summary?.passedChecks || 0}/${summary?.totalChecks || 0} aprovadas\n`;
    
    if (errorsByType.critical.length > 0) {
      summaryText += `❌ ${errorsByType.critical.length} erro(s) crítico(s)\n`;
    }
    if (errorsByType.high.length > 0) {
      summaryText += `⚠️ ${errorsByType.high.length} erro(s) de alta prioridade\n`;
    }
    if (warnings.length > 0) {
      summaryText += `💡 ${warnings.length} aviso(s)\n`;
    }
    
    return summaryText.trim();
  },

  /**
   * Determina cor do status baseado na saúde
   */
  getHealthColor: (health: ValidationResult['summary']['overallHealth']): string => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  },

  /**
   * Gera lista de recomendações baseada nos erros
   */
  generateRecommendations: (result: ValidationResult): string[] => {
    const recommendations: string[] = [];
    const { errors = [], warnings = [] } = result;
    
    // Recomendações baseadas em erros críticos
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push('Corrija imediatamente os erros críticos identificados');
    }
    
    // Recomendações baseadas em tipos de erro
    const hasBalanceError = errors.some(e => e.type === ErrorType.BALANCE_MISMATCH);
    if (hasBalanceError) {
      recommendations.push('Verifique os cálculos de saldo e balanço financeiro');
    }
    
    const hasNegativeError = errors.some(e => e.type === ErrorType.NEGATIVE_INVALID);
    if (hasNegativeError) {
      recommendations.push('Revise valores negativos que podem estar incorretos');
    }
    
    // Recomendações baseadas em warnings
    if (warnings.length > 3) {
      recommendations.push('Considere revisar os itens com avisos para melhorar a qualidade dos dados');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Prestação de contas está em conformidade');
    }
    
    return recommendations;
  }
};

// Re-exportar tipos importantes
export type { ValidationResult, ErrorType, WarningType };
