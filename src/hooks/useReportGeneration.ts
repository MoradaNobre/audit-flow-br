/**
 * Hook para Geração de Relatórios
 * Gerencia criação, exportação e compartilhamento de relatórios
 * Fase 2.2 - Relatórios Básicos
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RelatorioData } from '@/components/RelatorioTemplate';
import type { FinancialData } from '@/components/FinancialCharts';
import type { ValidationResult } from '@/lib/financialValidation';

export interface GenerateReportParams {
  prestacaoId: string;
  validationResult: ValidationResult;
  financialData: FinancialData;
  observacoes?: string;
  conclusao?: string;
}

export interface ReportSummary {
  id: string;
  prestacaoId: string;
  condominioNome: string;
  periodo: string;
  score: number;
  status: string;
  geradoEm: string;
  versao: string;
}

/**
 * Hook principal para geração de relatórios
 */
export function useReportGeneration() {
  const queryClient = useQueryClient();

  // Gerar novo relatório
  const generateReport = useMutation({
    mutationFn: async (params: GenerateReportParams): Promise<RelatorioData> => {
      console.log('🔄 Gerando relatório para prestação:', params.prestacaoId);

      try {
        // Buscar dados da prestação
        const { data: prestacao, error: prestacaoError } = await supabase
          .from('prestacoes_contas')
          .select(`
            id,
            mes_referencia,
            ano_referencia,
            created_at,
            condominio_id,
            condominios (
              nome,
              cnpj,
              endereco
            )
          `)
          .eq('id', params.prestacaoId)
          .single();

        if (prestacaoError || !prestacao) {
          throw new Error('Prestação não encontrada');
        }

        // Buscar usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        // Gerar inconsistências baseadas no resultado da validação
        const inconsistencias = (params.validationResult.errors || []).map(error => ({
          tipo: error.type,
          descricao: error.message,
          severidade: error.severity === 'critical' ? 'critica' as const :
                     error.severity === 'high' ? 'alta' as const :
                     error.severity === 'medium' ? 'media' as const : 'baixa' as const,
          recomendacao: getRecommendationForError(error.type)
        }));

        // Adicionar warnings como inconsistências de baixa severidade
        const warningInconsistencias = (params.validationResult.warnings || []).map(warning => ({
          tipo: warning.type,
          descricao: warning.message,
          severidade: 'baixa' as const,
          recomendacao: warning.suggestion || 'Revisar este item para melhorar a qualidade dos dados'
        }));

        const allInconsistencias = [...inconsistencias, ...warningInconsistencias];

        // Montar dados do relatório
        const reportData: RelatorioData = {
          id: `REL-${Date.now()}`,
          prestacaoId: params.prestacaoId,
          condominio: {
            nome: prestacao.condominios?.nome || 'Condomínio não informado',
            cnpj: prestacao.condominios?.cnpj || 'CNPJ não informado',
            endereco: prestacao.condominios?.endereco
          },
          periodo: {
            mes: prestacao.mes_referencia,
            ano: prestacao.ano_referencia,
            dataInicio: `${prestacao.ano_referencia}-${prestacao.mes_referencia.toString().padStart(2, '0')}-01`,
            dataFim: `${prestacao.ano_referencia}-${prestacao.mes_referencia.toString().padStart(2, '0')}-${getLastDayOfMonth(prestacao.mes_referencia, prestacao.ano_referencia)}`
          },
          financialData: params.financialData,
          validationResult: params.validationResult,
          geradoEm: new Date().toISOString(),
          geradoPor: user.email || 'Sistema',
          versao: '2.2',
          inconsistencias: allInconsistencias,
          observacoes: params.observacoes,
          conclusao: params.conclusao || generateAutoConclusion(params.validationResult, params.financialData)
        };

        // Salvar no banco (simulado - em produção salvaria na tabela relatorios_auditoria)
        console.log('📄 Relatório gerado:', reportData);

        toast.success('Relatório gerado com sucesso!', {
          description: `Score: ${params.validationResult.score || 0}% - ${params.validationResult.summary?.overallHealth || 'N/A'}`
        });

        return reportData;

      } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        throw error;
      }
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Buscar relatórios existentes
  const getReports = useQuery({
    queryKey: ['reports'],
    queryFn: async (): Promise<ReportSummary[]> => {
      // Em produção, buscaria da tabela relatorios_auditoria
      // Por enquanto, retorna dados mockados
      return [
        {
          id: 'REL-001',
          prestacaoId: 'prestacao-1',
          condominioNome: 'Residencial Morada Nobre',
          periodo: 'Fevereiro 2025',
          score: 95,
          status: 'Excelente',
          geradoEm: new Date().toISOString(),
          versao: '2.2'
        }
      ];
    }
  });

  return {
    generateReport: generateReport.mutate,
    generateReportAsync: generateReport.mutateAsync,
    isGenerating: generateReport.isPending,
    generationError: generateReport.error,
    reports: getReports.data || [],
    isLoadingReports: getReports.isLoading,
    refetchReports: getReports.refetch
  };
}

/**
 * Hook para análise rápida e geração de relatório
 */
export function useQuickReport() {
  const { generateReportAsync } = useReportGeneration();

  const generateQuickReport = useMutation({
    mutationFn: async (prestacaoId: string): Promise<RelatorioData> => {
      // Dados simulados para demonstração
      const sampleFinancialData: FinancialData = {
        saldoAnterior: 2000,
        receitas: 10000,
        despesas: 8000,
        saldoFinal: 4000,
        categorias: [
          { nome: 'Administração', valor: 3200, percentual: 40, cor: '#8884d8' },
          { nome: 'Manutenção', valor: 2800, percentual: 35, cor: '#82ca9d' },
          { nome: 'Limpeza', valor: 2000, percentual: 25, cor: '#ffc658' }
        ],
        comparacao: {
          mesAnterior: {
            receitas: 9500,
            despesas: 7800,
            saldo: 3700
          }
        }
      };

      // Resultado de validação simulado
      const sampleValidationResult: ValidationResult = {
        isValid: true,
        score: 95,
        errors: [],
        warnings: [
          {
            type: 'minor_discrepancy' as any,
            message: 'Pequena variação nos valores de arredondamento',
            field: 'categorias',
            value: 0.01,
            suggestion: 'Verificar cálculos de percentuais'
          }
        ],
        summary: {
          totalChecks: 8,
          passedChecks: 8,
          failedChecks: 0,
          warningsCount: 1,
          overallHealth: 'excellent'
        }
      };

      return generateReportAsync({
        prestacaoId,
        validationResult: sampleValidationResult,
        financialData: sampleFinancialData,
        conclusao: 'Prestação de contas em excelente estado, com todos os indicadores dentro dos parâmetros esperados.'
      });
    },
    onSuccess: () => {
      toast.success('Relatório rápido gerado!', {
        description: 'Análise completa disponível'
      });
    }
  });

  return {
    generateQuickReport: generateQuickReport.mutate,
    generateQuickReportAsync: generateQuickReport.mutateAsync,
    isGenerating: generateQuickReport.isPending,
    error: generateQuickReport.error
  };
}

// Funções auxiliares
function getRecommendationForError(errorType: string): string {
  const recommendations: Record<string, string> = {
    'balance_mismatch': 'Verificar os cálculos de saldo e conferir se todas as receitas e despesas foram contabilizadas corretamente.',
    'negative_invalid': 'Revisar valores negativos que podem indicar erros de lançamento ou categorização incorreta.',
    'percentage_invalid': 'Ajustar os percentuais das categorias para que a soma totalize exatamente 100%.',
    'date_inconsistency': 'Verificar as datas de início e fim do período para garantir consistência temporal.',
    'calculation_error': 'Revisar todos os cálculos matemáticos e fórmulas utilizadas.',
    'missing_data': 'Completar as informações obrigatórias que estão faltando.',
    'cnpj_invalid': 'Verificar e corrigir o CNPJ informado.',
    'outlier_detected': 'Investigar valores que estão muito acima ou abaixo da média histórica.'
  };

  return recommendations[errorType] || 'Revisar este item e tomar as ações corretivas necessárias.';
}

function getLastDayOfMonth(month: number, year: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return lastDay.toString().padStart(2, '0');
}

function generateAutoConclusion(validationResult: ValidationResult, financialData: FinancialData): string {
  const score = validationResult.score || 0;
  const health = validationResult.summary?.overallHealth || 'fair';
  const resultadoLiquido = (financialData.receitas || 0) - (financialData.despesas || 0);
  
  let conclusion = '';

  // Análise do score
  if (score >= 95) {
    conclusion += 'A prestação de contas apresenta excelente qualidade, ';
  } else if (score >= 85) {
    conclusion += 'A prestação de contas apresenta boa qualidade, ';
  } else if (score >= 70) {
    conclusion += 'A prestação de contas apresenta qualidade regular, ';
  } else {
    conclusion += 'A prestação de contas apresenta problemas que requerem atenção, ';
  }

  // Análise financeira
  if (resultadoLiquido > 0) {
    conclusion += `com resultado positivo de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultadoLiquido)}. `;
  } else if (resultadoLiquido < 0) {
    conclusion += `com déficit de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(resultadoLiquido))}. `;
  } else {
    conclusion += 'com resultado equilibrado. ';
  }

  // Recomendações gerais
  const errorsCount = validationResult.errors?.length || 0;
  const warningsCount = validationResult.warnings?.length || 0;
  
  if (errorsCount > 0) {
    conclusion += `Foram identificados ${errorsCount} erro(s) que devem ser corrigidos. `;
  }

  if (warningsCount > 0) {
    conclusion += `Há ${warningsCount} aviso(s) que merecem atenção para melhorar a qualidade dos dados. `;
  }

  if (score >= 90) {
    conclusion += 'Recomenda-se a aprovação da prestação de contas.';
  } else if (score >= 70) {
    conclusion += 'Recomenda-se a aprovação com ressalvas, após correção dos pontos identificados.';
  } else {
    conclusion += 'Recomenda-se a revisão completa antes da aprovação.';
  }

  return conclusion;
}
