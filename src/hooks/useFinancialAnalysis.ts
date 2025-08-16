/**
 * Hook simplificado para análise financeira de prestações de contas
 * Versão inicial focada na validação matemática básica
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
 * Hook principal para análise financeira
 */
export function useFinancialAnalysis(prestacaoId?: string) {
  const queryClient = useQueryClient();

  // Query para buscar análise existente
  const analysisQuery = useQuery({
    queryKey: ['financial-analysis', prestacaoId],
    queryFn: async () => {
      if (!prestacaoId) return null;

      try {
        const { data, error } = await supabase
          .rpc('get_financial_analysis', { prestacao_id: prestacaoId });

        if (error) {
          console.warn('Análise não encontrada:', error.message);
          return null;
        }

        return data?.[0] || null;
      } catch (error) {
        console.warn('Erro ao buscar análise:', error);
        return null;
      }
    },
    enabled: !!prestacaoId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para executar nova análise
  const analyzeFinancialData = useMutation({
    mutationFn: async (data: {
      prestacaoId: string;
      extractedData: any;
      forceReanalysis?: boolean;
    }) => {
      const startTime = Date.now();

      try {
        // Executar validação
        const validationResult = await financialValidator.validatePrestacao(data.extractedData);
        const processingTime = Date.now() - startTime;

        // Salvar resultado no banco
        const analysisData = {
          prestacao_id: data.prestacaoId,
          validation_result: validationResult,
          analyzed_at: new Date().toISOString(),
          metadata: {
            processingTime,
            dataSource: 'extracted' as const,
            version: '1.0.0'
          }
        };

        const { data: savedAnalysis, error } = await supabase
          .from('financial_analysis' as any)
          .upsert(analysisData, {
            onConflict: 'prestacao_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Erro ao salvar análise: ${error.message}`);
        }

        // Atualizar status da prestação
        await supabase
          .from('prestacoes_contas')
          .update({
            analysis_status: getAnalysisStatus(validationResult),
            analysis_score: validationResult.score,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.prestacaoId);

        return savedAnalysis;

      } catch (error) {
        console.error('Erro durante análise financeira:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['financial-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['prestacoes'] });
      
      const result = data.validation_result as ValidationResult;
      const criticalErrors = result.errors.filter(e => e.severity === 'critical').length;
      
      if (criticalErrors === 0) {
        toast.success(`Análise concluída! Score: ${result.score}%`);
      } else {
        toast.warning(`Análise concluída com ${criticalErrors} erro(s) crítico(s)`);
      }
    },
    onError: (error) => {
      console.error('Erro na análise:', error);
      toast.error('Erro ao executar análise financeira');
    }
  });

  return {
    // Dados da análise
    analysis: analysisQuery.data,
    isLoading: analysisQuery.isLoading,
    error: analysisQuery.error,
    
    // Ações
    analyzeFinancialData: analyzeFinancialData.mutate,
    isAnalyzing: analyzeFinancialData.isPending,
    
    // Utilitários
    refetch: analysisQuery.refetch,
  };
}

/**
 * Hook para listar análises com filtros
 */
export function useFinancialAnalysisList(
  condominioId?: string,
  filters?: AnalysisFilters,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: ['financial-analysis-list', condominioId, filters, options],
    queryFn: async () => {
      let query = supabase
        .from('financial_analysis' as any)
        .select(`
          *,
          prestacoes_contas!inner(
            id,
            nome_arquivo,
            condominio_id,
            created_at,
            condominios!inner(
              id,
              nome
            )
          )
        `)
        .order('analyzed_at', { ascending: false });

      // Filtrar por condomínio
      if (condominioId) {
        query = query.eq('prestacoes_contas.condominio_id', condominioId);
      }

      // Aplicar paginação
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options?.limit || 10)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar análises: ${error.message}`);
      }

      // Aplicar filtros locais (para filtros complexos)
      let filteredData = data || [];

      if (filters?.healthStatus) {
        filteredData = filteredData.filter(item => 
          (item.validation_result as ValidationResult)?.summary?.overallHealth === filters.healthStatus
        );
      }

      if (filters?.severity) {
        filteredData = filteredData.filter(item => {
          const result = item.validation_result as ValidationResult;
          return result?.errors?.some(error => error.severity === filters.severity);
        });
      }

      return filteredData;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para estatísticas de análises
 */
export function useAnalysisStats(condominioId?: string) {
  return useQuery({
    queryKey: ['analysis-stats', condominioId],
    queryFn: async () => {
      let query = supabase
        .from('financial_analysis' as any)
        .select(`
          validation_result,
          prestacoes_contas!inner(
            condominio_id
          )
        `);

      if (condominioId) {
        query = query.eq('prestacoes_contas.condominio_id', condominioId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      // Calcular estatísticas
      const stats = {
        total: data?.length || 0,
        byHealth: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        averageScore: 0,
        criticalErrors: 0,
        totalWarnings: 0,
        commonErrors: new Map<ErrorType, number>(),
        commonWarnings: new Map<WarningType, number>()
      };

      if (data && data.length > 0) {
        let totalScore = 0;

        for (const item of data) {
          const result = item.validation_result as ValidationResult;
          
          if (result) {
            // Contabilizar saúde
            stats.byHealth[result.summary.overallHealth]++;
            
            // Somar scores
            totalScore += result.score;
            
            // Contar erros críticos
            stats.criticalErrors += result.errors.filter(e => e.severity === 'critical').length;
            
            // Contar warnings
            stats.totalWarnings += result.warnings.length;
            
            // Mapear erros comuns
            for (const error of result.errors) {
              const count = stats.commonErrors.get(error.type) || 0;
              stats.commonErrors.set(error.type, count + 1);
            }
            
            // Mapear warnings comuns
            for (const warning of result.warnings) {
              const count = stats.commonWarnings.get(warning.type) || 0;
              stats.commonWarnings.set(warning.type, count + 1);
            }
          }
        }

        stats.averageScore = Math.round(totalScore / data.length);
      }

      return stats;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para reanalizar prestação
 */
export function useReanalyzePrestacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prestacaoId: string) => {
      // Buscar dados extraídos da prestação
      const { data: prestacao, error } = await supabase
        .from('prestacoes_contas')
        .select('extracted_data')
        .eq('id', prestacaoId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar prestação: ${error.message}`);
      }

      if (!prestacao?.extracted_data) {
        throw new Error('Dados extraídos não encontrados');
      }

      // Executar nova análise
      const validationResult = await financialValidator.validatePrestacao(prestacao.extracted_data);

      // Salvar resultado
      const { data: savedAnalysis, error: saveError } = await supabase
        .from('financial_analysis' as any)
        .upsert({
          prestacao_id: prestacaoId,
          validation_result: validationResult,
          analyzed_at: new Date().toISOString(),
          metadata: {
            processingTime: 0,
            dataSource: 'extracted' as const,
            version: '1.0.0'
          }
        }, {
          onConflict: 'prestacao_id'
        })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Erro ao salvar reanalise: ${saveError.message}`);
      }

      return savedAnalysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['prestacoes'] });
      toast.success('Reanalise concluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro na reanalise:', error);
      toast.error('Erro ao executar reanalise');
    }
  });
}

/**
 * Utilitários
 */
function getAnalysisStatus(validationResult: ValidationResult): string {
  const criticalErrors = validationResult.errors.filter(e => e.severity === 'critical').length;
  const highErrors = validationResult.errors.filter(e => e.severity === 'high').length;
  
  if (criticalErrors > 0) return 'critical_issues';
  if (highErrors > 0) return 'high_issues';
  if (validationResult.warnings.length > 0) return 'warnings';
  return 'approved';
}

export { ErrorType, WarningType, type ValidationResult };
