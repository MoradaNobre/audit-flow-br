/**
 * Componente de teste para o sistema de validação financeira
 * Use este componente para testar as validações implementadas
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Play, 
  RotateCcw, 
  TestTube,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useFinancialValidation, useQuickAnalysis } from '@/hooks/useFinancialValidation';
import { ValidationResults } from '@/components/ValidationResults';
import { ValidationResult } from '@/lib/financialValidation';

interface TestData {
  receitas: number;
  despesas: number;
  saldoAnterior: number;
  saldoFinal: number;
  cnpj: string;
  dataInicio: string;
  dataFim: string;
  categorias: Array<{
    nome: string;
    valor: number;
    percentual: number;
  }>;
}

const CENARIOS_TESTE = {
  perfeito: {
    nome: "✅ Cenário Perfeito",
    descricao: "Todos os cálculos corretos",
    dados: {
      receitas: 10000,
      despesas: 8000,
      saldoAnterior: 2000,
      saldoFinal: 4000, // 2000 + 10000 - 8000 = 4000
      cnpj: "11.222.333/0001-81",
      dataInicio: "2024-01-01",
      dataFim: "2024-01-31",
      categorias: [
        { nome: "Manutenção", valor: 4000, percentual: 50 },
        { nome: "Limpeza", valor: 2400, percentual: 30 },
        { nome: "Segurança", valor: 1600, percentual: 20 }
      ]
    }
  },
  balanco_incorreto: {
    nome: "❌ Balanço Incorreto",
    descricao: "Saldo final não bate com o cálculo",
    dados: {
      receitas: 10000,
      despesas: 8000,
      saldoAnterior: 2000,
      saldoFinal: 5000, // Deveria ser 4000
      cnpj: "11.222.333/0001-81",
      dataInicio: "2024-01-01",
      dataFim: "2024-01-31",
      categorias: [
        { nome: "Manutenção", valor: 4000, percentual: 50 },
        { nome: "Limpeza", valor: 2400, percentual: 30 },
        { nome: "Segurança", valor: 1600, percentual: 20 }
      ]
    }
  },
  receita_negativa: {
    nome: "⚠️ Receita Negativa",
    descricao: "Receita com valor negativo (inválido)",
    dados: {
      receitas: -5000, // Inválido
      despesas: 8000,
      saldoAnterior: 15000,
      saldoFinal: 2000,
      cnpj: "11.222.333/0001-81",
      dataInicio: "2024-01-01",
      dataFim: "2024-01-31",
      categorias: [
        { nome: "Manutenção", valor: 4000, percentual: 50 },
        { nome: "Limpeza", valor: 2400, percentual: 30 },
        { nome: "Segurança", valor: 1600, percentual: 20 }
      ]
    }
  },
  percentual_incorreto: {
    nome: "📊 Percentual Incorreto",
    descricao: "Soma dos percentuais não totaliza 100%",
    dados: {
      receitas: 10000,
      despesas: 8000,
      saldoAnterior: 2000,
      saldoFinal: 4000,
      cnpj: "11.222.333/0001-81",
      dataInicio: "2024-01-01",
      dataFim: "2024-01-31",
      categorias: [
        { nome: "Manutenção", valor: 4000, percentual: 60 }, // Total = 110%
        { nome: "Limpeza", valor: 2400, percentual: 30 },
        { nome: "Segurança", valor: 1600, percentual: 20 }
      ]
    }
  },
  cnpj_invalido: {
    nome: "🏢 CNPJ Inválido",
    descricao: "CNPJ com dígitos verificadores incorretos",
    dados: {
      receitas: 10000,
      despesas: 8000,
      saldoAnterior: 2000,
      saldoFinal: 4000,
      cnpj: "11.222.333/0001-99", // Dígitos incorretos
      dataInicio: "2024-01-01",
      dataFim: "2024-01-31",
      categorias: [
        { nome: "Manutenção", valor: 4000, percentual: 50 },
        { nome: "Limpeza", valor: 2400, percentual: 30 },
        { nome: "Segurança", valor: 1600, percentual: 20 }
      ]
    }
  },
  outlier: {
    nome: "📈 Outlier Detectado",
    descricao: "Valor muito diferente da média",
    dados: {
      receitas: 10000,
      despesas: 8000,
      saldoAnterior: 2000,
      saldoFinal: 4000,
      cnpj: "11.222.333/0001-81",
      dataInicio: "2024-01-01",
      dataFim: "2024-01-31",
      categorias: [
        { nome: "Manutenção", valor: 100, percentual: 1.25 },
        { nome: "Limpeza", valor: 200, percentual: 2.5 },
        { nome: "Segurança", valor: 7700, percentual: 96.25 } // Outlier
      ]
    }
  }
};

export function FinancialValidationTest() {
  const [dadosCustom, setDadosCustom] = useState<TestData>(CENARIOS_TESTE.perfeito.dados);
  const [resultadoValidacao, setResultadoValidacao] = useState<ValidationResult | null>(null);
  const [cenarioAtivo, setCenarioAtivo] = useState<string>('perfeito');

  const { validateFinancialData, isValidating } = useFinancialValidation();
  const quickAnalysis = useQuickAnalysis();

  const executarTeste = async (dados: TestData) => {
    try {
      console.log('🧪 Executando teste com dados:', dados);
      
      const resultado = await quickAnalysis.mutateAsync({
        receitas: dados.receitas,
        despesas: dados.despesas,
        saldoAnterior: dados.saldoAnterior,
        saldoFinal: dados.saldoFinal,
        cnpj: dados.cnpj,
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        categorias: dados.categorias
      });

      setResultadoValidacao(resultado);
    } catch (error) {
      console.error('Erro no teste:', error);
    }
  };

  const carregarCenario = (chave: string) => {
    const cenario = CENARIOS_TESTE[chave as keyof typeof CENARIOS_TESTE];
    setDadosCustom(cenario.dados);
    setCenarioAtivo(chave);
    setResultadoValidacao(null);
  };

  const limparResultados = () => {
    setResultadoValidacao(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste do Sistema de Validação Financeira
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Use este componente para testar as validações matemáticas implementadas na Fase 2.1
          </p>
        </CardHeader>
      </Card>

      {/* Cenários Pré-definidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cenários de Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(CENARIOS_TESTE).map(([chave, cenario]) => (
              <Button
                key={chave}
                variant={cenarioAtivo === chave ? "default" : "outline"}
                className="h-auto p-4 text-left justify-start"
                onClick={() => carregarCenario(chave)}
              >
                <div>
                  <div className="font-medium text-sm">{cenario.nome}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {cenario.descricao}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dados de Entrada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Dados de Entrada
            </span>
            <Badge variant="outline">
              {CENARIOS_TESTE[cenarioAtivo as keyof typeof CENARIOS_TESTE]?.nome}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Valores Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="receitas">Receitas (R$)</Label>
              <Input
                id="receitas"
                type="number"
                value={dadosCustom.receitas}
                onChange={(e) => setDadosCustom({
                  ...dadosCustom,
                  receitas: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div>
              <Label htmlFor="despesas">Despesas (R$)</Label>
              <Input
                id="despesas"
                type="number"
                value={dadosCustom.despesas}
                onChange={(e) => setDadosCustom({
                  ...dadosCustom,
                  despesas: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div>
              <Label htmlFor="saldoAnterior">Saldo Anterior (R$)</Label>
              <Input
                id="saldoAnterior"
                type="number"
                value={dadosCustom.saldoAnterior}
                onChange={(e) => setDadosCustom({
                  ...dadosCustom,
                  saldoAnterior: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div>
              <Label htmlFor="saldoFinal">Saldo Final (R$)</Label>
              <Input
                id="saldoFinal"
                type="number"
                value={dadosCustom.saldoFinal}
                onChange={(e) => setDadosCustom({
                  ...dadosCustom,
                  saldoFinal: parseFloat(e.target.value) || 0
                })}
              />
            </div>
          </div>

          <Separator />

          {/* Dados Adicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={dadosCustom.cnpj}
                onChange={(e) => setDadosCustom({
                  ...dadosCustom,
                  cnpj: e.target.value
                })}
                placeholder="11.222.333/0001-81"
              />
            </div>
            <div>
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dadosCustom.dataInicio}
                onChange={(e) => setDadosCustom({
                  ...dadosCustom,
                  dataInicio: e.target.value
                })}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dadosCustom.dataFim}
                onChange={(e) => setDadosCustom({
                  ...dadosCustom,
                  dataFim: e.target.value
                })}
              />
            </div>
          </div>

          <Separator />

          {/* Cálculo Esperado */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Cálculo Esperado
            </h4>
            <div className="text-sm space-y-1">
              <div>
                Saldo Anterior: <strong>R$ {dadosCustom.saldoAnterior.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
              </div>
              <div>
                + Receitas: <strong>R$ {dadosCustom.receitas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
              </div>
              <div>
                - Despesas: <strong>R$ {dadosCustom.despesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
              </div>
              <div className="border-t pt-1 mt-2">
                = Saldo Final Esperado: <strong className="text-blue-600">
                  R$ {(dadosCustom.saldoAnterior + dadosCustom.receitas - dadosCustom.despesas).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </strong>
              </div>
              <div>
                Saldo Final Informado: <strong className={
                  Math.abs((dadosCustom.saldoAnterior + dadosCustom.receitas - dadosCustom.despesas) - dadosCustom.saldoFinal) <= 0.01
                    ? "text-green-600" 
                    : "text-red-600"
                }>
                  R$ {dadosCustom.saldoFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </strong>
              </div>
              {Math.abs((dadosCustom.saldoAnterior + dadosCustom.receitas - dadosCustom.despesas) - dadosCustom.saldoFinal) > 0.01 && (
                <div className="text-red-600 text-xs">
                  ⚠️ Diferença: R$ {Math.abs((dadosCustom.saldoAnterior + dadosCustom.receitas - dadosCustom.despesas) - dadosCustom.saldoFinal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button 
              onClick={() => executarTeste(dadosCustom)}
              disabled={isValidating || quickAnalysis.isPending}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isValidating || quickAnalysis.isPending ? 'Validando...' : 'Executar Validação'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={limparResultados}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar Resultados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {resultadoValidacao && (
        <ValidationResults 
          result={resultadoValidacao}
          processingTime={quickAnalysis.data ? 150 : undefined}
        />
      )}

      {/* Status */}
      {(isValidating || quickAnalysis.isPending) && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Executando validação financeira...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
