/**
 * Sistema de Validação Financeira
 * Implementa validações matemáticas e detecção de inconsistências
 * em prestações de contas de condomínios
 */

import { z } from 'zod';

// Tipos para validação financeira
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: ErrorType;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  field?: string;
  expectedValue?: number;
  actualValue?: number;
  difference?: number;
}

export interface ValidationWarning {
  type: WarningType;
  message: string;
  field?: string;
  value?: number;
  suggestion?: string;
}

export interface ValidationSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningsCount: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

export enum ErrorType {
  BALANCE_MISMATCH = 'balance_mismatch',
  NEGATIVE_INVALID = 'negative_invalid',
  PERCENTAGE_INVALID = 'percentage_invalid',
  DATE_INCONSISTENCY = 'date_inconsistency',
  CALCULATION_ERROR = 'calculation_error',
  MISSING_DATA = 'missing_data',
  OUTLIER_DETECTED = 'outlier_detected',
  CNPJ_INVALID = 'cnpj_invalid'
}

export enum WarningType {
  UNUSUAL_VARIATION = 'unusual_variation',
  HIGH_EXPENSE = 'high_expense',
  LOW_RESERVE = 'low_reserve',
  CATEGORY_IMBALANCE = 'category_imbalance',
  DATE_PROXIMITY = 'date_proximity'
}

// Configurações de validação
export const VALIDATION_CONFIG = {
  // Tolerâncias para cálculos
  BALANCE_TOLERANCE: 0.01, // R$ 0,01
  PERCENTAGE_TOLERANCE: 0.001, // 0.1%
  
  // Limites para outliers
  OUTLIER_THRESHOLD: 3, // Desvios padrão
  HIGH_VARIATION_THRESHOLD: 0.5, // 50%
  
  // Limites de valores
  MAX_EXPENSE_PERCENTAGE: 0.95, // 95% das receitas
  MIN_RESERVE_PERCENTAGE: 0.05, // 5% das receitas
  
  // Validação de datas
  MAX_DATE_DIFF_DAYS: 35, // Máximo 35 dias para período mensal
  MIN_DATE_DIFF_DAYS: 25, // Mínimo 25 dias para período mensal
} as const;

/**
 * Classe principal para validação financeira
 */
export class FinancialValidator {
  private config = VALIDATION_CONFIG;
  
  /**
   * Executa todas as validações em uma prestação de contas
   */
  async validatePrestacao(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    try {
      // 1. Validação de estrutura de dados
      const structureResult = this.validateDataStructure(data);
      totalChecks += structureResult.checks;
      passedChecks += structureResult.passed;
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);

      // 2. Validação de saldos e balanços
      const balanceResult = this.validateBalance(data);
      totalChecks += balanceResult.checks;
      passedChecks += balanceResult.passed;
      errors.push(...balanceResult.errors);
      warnings.push(...balanceResult.warnings);

      // 3. Validação de percentuais
      const percentageResult = this.validatePercentages(data);
      totalChecks += percentageResult.checks;
      passedChecks += percentageResult.passed;
      errors.push(...percentageResult.errors);
      warnings.push(...percentageResult.warnings);

      // 4. Validação de valores negativos
      const negativeResult = this.validateNegativeValues(data);
      totalChecks += negativeResult.checks;
      passedChecks += negativeResult.passed;
      errors.push(...negativeResult.errors);
      warnings.push(...negativeResult.warnings);

      // 5. Validação de datas
      const dateResult = this.validateDates(data);
      totalChecks += dateResult.checks;
      passedChecks += dateResult.passed;
      errors.push(...dateResult.errors);
      warnings.push(...dateResult.warnings);

      // 6. Detecção de outliers
      const outlierResult = this.detectOutliers(data);
      totalChecks += outlierResult.checks;
      passedChecks += outlierResult.passed;
      errors.push(...outlierResult.errors);
      warnings.push(...outlierResult.warnings);

      // 7. Validação de CNPJ
      const cnpjResult = this.validateCNPJ(data);
      totalChecks += cnpjResult.checks;
      passedChecks += cnpjResult.passed;
      errors.push(...cnpjResult.errors);
      warnings.push(...cnpjResult.warnings);

      // Calcular score e resumo
      const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
      const summary = this.generateSummary(totalChecks, passedChecks, errors.length, warnings.length);

      return {
        isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
        score,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      console.error('Erro durante validação:', error);
      
      return {
        isValid: false,
        score: 0,
        errors: [{
          type: ErrorType.CALCULATION_ERROR,
          message: 'Erro interno durante validação',
          severity: 'critical'
        }],
        warnings: [],
        summary: {
          totalChecks: 1,
          passedChecks: 0,
          failedChecks: 1,
          warningsCount: 0,
          overallHealth: 'poor'
        }
      };
    }
  }

  /**
   * Valida estrutura básica dos dados
   */
  private validateDataStructure(data: any) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let checks = 0;
    let passed = 0;

    // Verificar campos obrigatórios
    const requiredFields = ['receitas', 'despesas', 'saldoAnterior', 'saldoFinal'];
    
    for (const field of requiredFields) {
      checks++;
      if (data[field] !== undefined && data[field] !== null) {
        passed++;
      } else {
        errors.push({
          type: ErrorType.MISSING_DATA,
          message: `Campo obrigatório ausente: ${field}`,
          severity: 'critical',
          field
        });
      }
    }

    // Verificar se valores são numéricos
    const numericFields = ['receitas', 'despesas', 'saldoAnterior', 'saldoFinal'];
    
    for (const field of numericFields) {
      if (data[field] !== undefined) {
        checks++;
        if (typeof data[field] === 'number' && !isNaN(data[field])) {
          passed++;
        } else {
          errors.push({
            type: ErrorType.CALCULATION_ERROR,
            message: `Campo ${field} deve ser numérico`,
            severity: 'high',
            field,
            actualValue: data[field]
          });
        }
      }
    }

    return { checks, passed, errors, warnings };
  }

  /**
   * Valida balanço financeiro: Saldo Anterior + Receitas - Despesas = Saldo Final
   */
  private validateBalance(data: any) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let checks = 0;
    let passed = 0;

    if (this.hasRequiredBalanceFields(data)) {
      checks++;
      
      const { saldoAnterior, receitas, despesas, saldoFinal } = data;
      const calculatedBalance = saldoAnterior + receitas - despesas;
      const difference = Math.abs(calculatedBalance - saldoFinal);

      if (difference <= this.config.BALANCE_TOLERANCE) {
        passed++;
      } else {
        errors.push({
          type: ErrorType.BALANCE_MISMATCH,
          message: `Inconsistência no balanço financeiro`,
          severity: 'critical',
          field: 'saldoFinal',
          expectedValue: calculatedBalance,
          actualValue: saldoFinal,
          difference
        });
      }

      // Verificar se despesas excedem receitas + saldo anterior
      checks++;
      const availableFunds = saldoAnterior + receitas;
      
      if (despesas <= availableFunds * this.config.MAX_EXPENSE_PERCENTAGE) {
        passed++;
      } else {
        warnings.push({
          type: WarningType.HIGH_EXPENSE,
          message: `Despesas muito altas em relação aos recursos disponíveis`,
          field: 'despesas',
          value: despesas,
          suggestion: `Considere revisar as despesas. Disponível: R$ ${availableFunds.toFixed(2)}`
        });
      }

      // Verificar reserva mínima
      checks++;
      const reservePercentage = saldoFinal / receitas;
      
      if (reservePercentage >= this.config.MIN_RESERVE_PERCENTAGE || saldoFinal >= 0) {
        passed++;
      } else {
        warnings.push({
          type: WarningType.LOW_RESERVE,
          message: `Saldo final muito baixo`,
          field: 'saldoFinal',
          value: saldoFinal,
          suggestion: `Recomenda-se manter reserva mínima de ${(this.config.MIN_RESERVE_PERCENTAGE * 100).toFixed(1)}%`
        });
      }
    }

    return { checks, passed, errors, warnings };
  }

  /**
   * Valida percentuais (se aplicável)
   */
  private validatePercentages(data: any) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let checks = 0;
    let passed = 0;

    // Se existirem categorias com percentuais
    if (data.categorias && Array.isArray(data.categorias)) {
      checks++;
      
      const totalPercentage = data.categorias.reduce((sum: number, cat: any) => {
        return sum + (cat.percentual || 0);
      }, 0);

      if (Math.abs(totalPercentage - 100) <= this.config.PERCENTAGE_TOLERANCE * 100) {
        passed++;
      } else {
        errors.push({
          type: ErrorType.PERCENTAGE_INVALID,
          message: `Soma dos percentuais não totaliza 100%`,
          severity: 'medium',
          field: 'categorias',
          expectedValue: 100,
          actualValue: totalPercentage,
          difference: Math.abs(totalPercentage - 100)
        });
      }
    }

    return { checks, passed, errors, warnings };
  }

  /**
   * Valida valores negativos inválidos
   */
  private validateNegativeValues(data: any) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let checks = 0;
    let passed = 0;

    // Campos que não devem ser negativos
    const positiveFields = ['receitas'];
    
    for (const field of positiveFields) {
      if (data[field] !== undefined) {
        checks++;
        if (data[field] >= 0) {
          passed++;
        } else {
          errors.push({
            type: ErrorType.NEGATIVE_INVALID,
            message: `${field} não pode ser negativo`,
            severity: 'high',
            field,
            actualValue: data[field]
          });
        }
      }
    }

    // Campos que podem ser negativos mas merecem atenção
    const watchFields = ['saldoFinal'];
    
    for (const field of watchFields) {
      if (data[field] !== undefined && data[field] < 0) {
        warnings.push({
          type: WarningType.UNUSUAL_VARIATION,
          message: `${field} está negativo`,
          field,
          value: data[field],
          suggestion: 'Verifique se este valor está correto'
        });
      }
    }

    return { checks, passed, errors, warnings };
  }

  /**
   * Valida consistência de datas
   */
  private validateDates(data: any) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let checks = 0;
    let passed = 0;

    if (data.dataInicio && data.dataFim) {
      checks++;
      
      const inicio = new Date(data.dataInicio);
      const fim = new Date(data.dataFim);
      const diffDays = Math.abs((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= this.config.MIN_DATE_DIFF_DAYS && diffDays <= this.config.MAX_DATE_DIFF_DAYS) {
        passed++;
      } else {
        if (diffDays < this.config.MIN_DATE_DIFF_DAYS) {
          warnings.push({
            type: WarningType.DATE_PROXIMITY,
            message: `Período muito curto: ${diffDays.toFixed(0)} dias`,
            suggestion: 'Verifique se as datas estão corretas'
          });
        } else {
          warnings.push({
            type: WarningType.DATE_PROXIMITY,
            message: `Período muito longo: ${diffDays.toFixed(0)} dias`,
            suggestion: 'Verifique se as datas estão corretas'
          });
        }
      }

      // Verificar ordem das datas
      checks++;
      if (inicio <= fim) {
        passed++;
      } else {
        errors.push({
          type: ErrorType.DATE_INCONSISTENCY,
          message: 'Data de início posterior à data de fim',
          severity: 'medium',
          field: 'dataInicio'
        });
      }
    }

    return { checks, passed, errors, warnings };
  }

  /**
   * Detecta outliers em categorias de despesas
   */
  private detectOutliers(data: any) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let checks = 0;
    let passed = 0;

    if (data.categorias && Array.isArray(data.categorias) && data.categorias.length > 2) {
      const valores = data.categorias.map((cat: any) => cat.valor || 0).filter((v: number) => v > 0);
      
      if (valores.length > 2) {
        checks++;
        
        const mean = valores.reduce((a: number, b: number) => a + b, 0) / valores.length;
        const variance = valores.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / valores.length;
        const stdDev = Math.sqrt(variance);

        let outliersFound = false;
        
        for (const categoria of data.categorias) {
          const valor = categoria.valor || 0;
          if (valor > 0) {
            const zScore = Math.abs((valor - mean) / stdDev);
            
            if (zScore > this.config.OUTLIER_THRESHOLD) {
              outliersFound = true;
              warnings.push({
                type: WarningType.CATEGORY_IMBALANCE,
                message: `Valor atípico na categoria ${categoria.nome || 'não identificada'}`,
                field: 'categorias',
                value: valor,
                suggestion: `Valor muito diferente da média (R$ ${mean.toFixed(2)})`
              });
            }
          }
        }

        if (!outliersFound) {
          passed++;
        }
      }
    }

    return { checks, passed, errors, warnings };
  }

  /**
   * Valida CNPJ do condomínio
   */
  private validateCNPJ(data: any) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let checks = 0;
    let passed = 0;

    if (data.cnpj) {
      checks++;
      
      const cnpj = data.cnpj.replace(/\D/g, '');
      
      if (this.isValidCNPJ(cnpj)) {
        passed++;
      } else {
        errors.push({
          type: ErrorType.CNPJ_INVALID,
          message: 'CNPJ inválido',
          severity: 'medium',
          field: 'cnpj',
          actualValue: data.cnpj
        });
      }
    }

    return { checks, passed, errors, warnings };
  }

  /**
   * Utilitários
   */
  private hasRequiredBalanceFields(data: any): boolean {
    return data.saldoAnterior !== undefined && 
           data.receitas !== undefined && 
           data.despesas !== undefined && 
           data.saldoFinal !== undefined;
  }

  private isValidCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;
    
    // Validação dos dígitos verificadores
    let soma = 0;
    let peso = 2;
    
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cnpj.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const resto = soma % 11;
    const dv1 = resto < 2 ? 0 : 11 - resto;
    
    if (parseInt(cnpj.charAt(12)) !== dv1) return false;
    
    soma = 0;
    peso = 2;
    
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cnpj.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const resto2 = soma % 11;
    const dv2 = resto2 < 2 ? 0 : 11 - resto2;
    
    return parseInt(cnpj.charAt(13)) === dv2;
  }

  private generateSummary(totalChecks: number, passedChecks: number, errorsCount: number, warningsCount: number): ValidationSummary {
    const failedChecks = totalChecks - passedChecks;
    let overallHealth: ValidationSummary['overallHealth'];
    
    const successRate = totalChecks > 0 ? passedChecks / totalChecks : 0;
    
    if (successRate >= 0.95 && errorsCount === 0) {
      overallHealth = 'excellent';
    } else if (successRate >= 0.85 && errorsCount <= 1) {
      overallHealth = 'good';
    } else if (successRate >= 0.70 && errorsCount <= 3) {
      overallHealth = 'fair';
    } else {
      overallHealth = 'poor';
    }

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      warningsCount,
      overallHealth
    };
  }
}

/**
 * Instância singleton do validador
 */
export const financialValidator = new FinancialValidator();

/**
 * Função utilitária para validação rápida
 */
export async function validateFinancialData(data: any): Promise<ValidationResult> {
  return financialValidator.validatePrestacao(data);
}
