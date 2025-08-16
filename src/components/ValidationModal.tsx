/**
 * Modal para exibir resultados da validação financeira
 * Mostra validação em tempo real para prestações existentes
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ValidationResults } from './ValidationResults';
import { RelatorioTemplate, type RelatorioData } from './RelatorioTemplate';
import { useFinancialValidation } from '@/hooks/useFinancialValidation';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { usePDFExport } from '@/lib/pdfExport';
import { BarChart3, Calendar, Building2, Play, RotateCcw, X, FileText, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface ValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prestacaoId: string;
  prestacaoInfo: {
    mes: number;
    ano: number;
    status: string;
  };
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  open,
  onOpenChange,
  prestacaoId,
  prestacaoInfo
}) => {
  const [validationResult, setValidationResult] = useState<any>(null);
  const [reportData, setReportData] = useState<RelatorioData | null>(null);
  const [showReport, setShowReport] = useState(false);
  const { validateFinancialDataAsync, isValidating } = useFinancialValidation();
  const { generateReportAsync, isGenerating } = useReportGeneration();
  const { exportReport } = usePDFExport();
  const [hasValidated, setHasValidated] = React.useState(false);

  // Dados simulados para demonstração
  const sampleFinancialData = {
    saldoAnterior: 2000,
    receitas: 10000,
    despesas: 8000,
    saldoFinal: 4000,
    cnpj: '11.222.333/0001-81',
    dataInicio: `${prestacaoInfo.ano}-${prestacaoInfo.mes.toString().padStart(2, '0')}-01`,
    dataFim: `${prestacaoInfo.ano}-${prestacaoInfo.mes.toString().padStart(2, '0')}-31`,
    categorias: [
      { nome: 'Administração', percentual: 40 },
      { nome: 'Manutenção', percentual: 35 },
      { nome: 'Limpeza', percentual: 25 }
    ]
  };

  const handleValidate = async () => {
    try {
      console.log(' Executando validação financeira para prestação:', prestacaoId);
      
      const result = await validateFinancialDataAsync({
        prestacaoId,
        extractedData: sampleFinancialData
      });
      
      setValidationResult(result);
      setHasValidated(true);
      
      console.log(' Validação concluída:', result);
    } catch (error) {
      console.error('Erro na validação:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!validationResult || !prestacaoId) return;

    try {
      // Dados financeiros simulados (mesmos da validação)
      const financialData = {
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

      const report = await generateReportAsync({
        prestacaoId: prestacaoId,
        validationResult,
        financialData,
        observacoes: 'Relatório gerado automaticamente a partir da validação financeira.',
        conclusao: 'Prestação de contas em excelente estado com todos os indicadores dentro dos parâmetros esperados.'
      });

      setReportData(report);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) return;
    
    try {
      await exportReport(reportData, {
        filename: `relatorio-${prestacaoId}-${prestacaoInfo.mes.toString().padStart(2, '0')}-${prestacaoInfo.ano}.pdf`
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    }
  };

  const resetValidation = () => {
    setValidationResult(null);
    setHasValidated(false);
  };

  React.useEffect(() => {
    if (open) {
      resetValidation();
    }
  }, [open]);

  const getStatusIcon = () => {
    if (isValidating) return <Calendar className="h-5 w-5 animate-pulse text-blue-500" />;
    if (validationResult) return <Building2 className="h-5 w-5 text-green-500" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (isValidating) return 'Validando...';
    if (validationResult) return 'Validação Concluída';
    return 'Aguardando Validação';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Validação Financeira - {prestacaoInfo.mes.toString().padStart(2, '0')}/{prestacaoInfo.ano}
          </DialogTitle>
          <DialogDescription>
            Análise matemática e validação de consistência da prestação de contas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Status da Validação */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-medium">{getStatusText()}</p>
                <p className="text-sm text-muted-foreground">
                  {validationResult 
                    ? `Processado em ${validationResult.processingTime}ms`
                    : 'Clique em "Executar Validação" para analisar'
                  }
                </p>
              </div>
            </div>
            
            {validationResult && (
              <Badge variant={validationResult.validationResult.score >= 85 ? 'default' : 'destructive'}>
                Score: {validationResult.validationResult.score}%
              </Badge>
            )}
          </div>

          {/* Dados Analisados */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
              Dados Financeiros Analisados
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Saldo Anterior</p>
                <p className="font-medium">R$ {sampleFinancialData.saldoAnterior.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Receitas</p>
                <p className="font-medium text-green-600">R$ {sampleFinancialData.receitas.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Despesas</p>
                <p className="font-medium text-red-600">R$ {sampleFinancialData.despesas.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo Final</p>
                <p className="font-medium">R$ {sampleFinancialData.saldoFinal.toLocaleString('pt-BR')}</p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Cálculo Esperado:</strong> R$ {sampleFinancialData.saldoAnterior.toLocaleString('pt-BR')} + 
                R$ {sampleFinancialData.receitas.toLocaleString('pt-BR')} - 
                R$ {sampleFinancialData.despesas.toLocaleString('pt-BR')} = 
                R$ {(sampleFinancialData.saldoAnterior + sampleFinancialData.receitas - sampleFinancialData.despesas).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Resultados da Validação */}
          {validationResult && (
            <ValidationResults result={validationResult.validationResult} />
          )}

          {/* Botão para Gerar Relatório */}
          <div className="flex gap-2 mt-6">
            <Button 
              onClick={handleValidate}
              disabled={isValidating}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Validando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Executar Validação
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isGenerating ? 'Gerando Relatório...' : 'Gerar Relatório Completo'}
            </Button>
            
            {reportData && (
              <Button 
                variant="outline" 
                onClick={() => setShowReport(true)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Relatório
              </Button>
            )}
          </div>

          {/* Placeholder quando não validado */}
          {!hasValidated && !isValidating && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">Validação Pendente</p>
              <p className="text-sm">
                Execute a validação para ver análise detalhada dos dados financeiros
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
          
          {!validationResult && (
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Executar Validação
                </>
              )}
            </Button>
          )}
          
          {validationResult && (
            <Button
              variant="outline"
              onClick={resetValidation}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Nova Validação
            </Button>
          )}
        </div>
      </DialogContent>
      
      {/* Modal do Relatório */}
      {showReport && reportData && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Relatório de Auditoria</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportPDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowReport(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)] p-4">
              <RelatorioTemplate 
                data={reportData} 
                onExportPDF={handleExportPDF}
              />
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};
