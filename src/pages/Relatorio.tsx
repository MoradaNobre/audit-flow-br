import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, BarChart3, PieChart, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { Cell, Pie, PieChart as RechartsPieChart, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRelatorio as useRelatorioDatabase } from '@/hooks/useDatabase';
import { useRelatorio } from '@/hooks/useRelatorios';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InconsistenciaType {
  id: string;
  descricao: string;
  tipo: 'financeira' | 'conformidade';
  nivel_criticidade: 'baixo' | 'médio' | 'alto';
}

interface RelatorioAuditoriaExtended {
  id: string;
  prestacao_id: string;
  resumo?: string;
  conteudo_gerado?: any;
  data_geracao: string;
  prestacoes_contas?: {
    condominio_id: string;
    mes_referencia: number;
    ano_referencia: number;
    arquivo_url: string;
    condominios?: {
      nome: string;
    };
  };
}

const mockRelatorio = {
  resumo: "Análise da prestação de contas de janeiro/2025 do Residencial Vila Verde",
  situacao_geral: "Gestão financeira eficiente com excelente controle de gastos",
  resumo_financeiro: {
    balanco_total: 127850.00,
    total_despesas: 89640.75,
    maior_gasto: 28500.00,
    categoria_maior_gasto: "Manutenção e Reformas",
    saldo_final: 38209.25
  },
  distribuicao_despesas: [
    { categoria: "Manutenção", valor: 28500 },
    { categoria: "Limpeza", valor: 18200 },
    { categoria: "Segurança", valor: 15800 },
    { categoria: "Energia", valor: 12400 },
    { categoria: "Água", valor: 8900 },
    { categoria: "Administração", valor: 5840 }
  ],
  distribuicao_percentual: [
    { categoria: "Manutenção e Reformas", valor: 31.8, cor: "#8884d8" },
    { categoria: "Limpeza e Conservação", valor: 20.3, cor: "#82ca9d" },
    { categoria: "Segurança Patrimonial", valor: 17.6, cor: "#ffc658" },
    { categoria: "Energia Elétrica", valor: 13.8, cor: "#8dd1e1" },
    { categoria: "Abastecimento de Água", valor: 9.9, cor: "#ff7c7c" },
    { categoria: "Taxa Administrativa", valor: 6.5, cor: "#d084d0" }
  ],
  inconsistencias: [
    {
      tipo: "Financeira",
      descricao: "Gasto com energia elétrica 8% abaixo da média, indicando economia eficiente",
      nivel_criticidade: "baixo"
    },
    {
      tipo: "Conformidade",
      descricao: "Documentação completa e organizada conforme normas contábeis",
      nivel_criticidade: "baixo"
    },
    {
      tipo: "Financeira",
      descricao: "Reserva de emergência mantida em 30% do orçamento mensal",
      nivel_criticidade: "baixo"
    }
  ],
  periodo: "01/2025",
  condominio: "Residencial Vila Verde"
};

const getCriticidadeColor = (nivel: string) => {
  switch (nivel) {
    case 'baixo':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'médio':
      return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'alto':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

const getTipoColor = (tipo: string) => {
  switch (tipo) {
    case 'Financeira':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'Conformidade':
      return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
};

export default function Relatorio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: relatorio, isLoading, error } = useRelatorio(id!) as { data: RelatorioAuditoriaExtended | null, isLoading: boolean, error: any };
  const { data: relatorioCompleto, isLoading: loadingDatabase } = useRelatorioDatabase(id!);

  const exportToPDF = async () => {
    const element = document.getElementById('relatorio-content');
    if (!element) return;

    try {
      toast({ title: "Gerando PDF...", description: "Por favor, aguarde." });
      
      const canvas = await html2canvas(element, {
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename using relatorio data
      const condominio = relatorio?.prestacoes_contas?.condominios?.nome || 'relatorio';
      const periodo = relatorio?.prestacoes_contas ? 
        `${relatorio.prestacoes_contas.mes_referencia?.toString().padStart(2, '0')}_${relatorio.prestacoes_contas.ano_referencia}` : 
        new Date().toISOString().split('T')[0];
      const filename = `relatorio_auditoria_${condominio.replace(/\s+/g, '_')}_${periodo}.pdf`;
      pdf.save(filename);
      
      toast({ title: "PDF exportado com sucesso!" });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({ 
        title: "Erro ao exportar PDF", 
        description: "Tente novamente.", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading || loadingDatabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !relatorio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Relatório não encontrado</h1>
          <p className="text-muted-foreground mb-4">O relatório solicitado não existe ou você não tem permissão para acessá-lo.</p>
          <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  // Use real data from database if available, then from relatorio, fallback to mock
  let reportData = mockRelatorio;
  let inconsistencias = mockRelatorio.inconsistencias;
  
  // Check if we have data from database (with inconsistencies)
  if (relatorioCompleto?.relatorio?.conteudo_gerado && Object.keys(relatorioCompleto.relatorio.conteudo_gerado).length > 0) {
    reportData = relatorioCompleto.relatorio.conteudo_gerado;
    // Map database inconsistencias to expected format
    inconsistencias = relatorioCompleto.inconsistencias?.map(inc => ({
      tipo: inc.tipo === 'financeira' ? 'Financeira' : 'Conformidade',
      descricao: inc.descricao,
      nivel_criticidade: inc.nivel_criticidade === 'baixa' ? 'baixo' : 
                        inc.nivel_criticidade === 'media' ? 'médio' : 'alto'
    })) || [];
  } 
  // Check if we have data from relatorio hook
  else if (relatorio?.conteudo_gerado && Object.keys(relatorio.conteudo_gerado).length > 0) {
    reportData = relatorio.conteudo_gerado;
  }

  // Ensure we have periodo and condominio data from the relatorio
  if (relatorio?.prestacoes_contas) {
    const prestacao = relatorio.prestacoes_contas;
    reportData = {
      ...reportData,
      periodo: `${prestacao.mes_referencia?.toString().padStart(2, '0')}/${prestacao.ano_referencia}`,
      condominio: prestacao.condominios?.nome || reportData.condominio
    };
  }

  console.log('Dados do relatório:', {
    relatorio: relatorio,
    relatorioCompleto: relatorioCompleto,
    reportData: reportData,
    inconsistencias: inconsistencias,
    usando_dados_reais: !!(relatorioCompleto?.relatorio?.conteudo_gerado && Object.keys(relatorioCompleto.relatorio.conteudo_gerado).length > 0)
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Relatório de Auditoria</h1>
                  <p className="text-sm text-muted-foreground">
                    {reportData.condominio} - {reportData.periodo}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">dna1973@gmail.com</p>
                <p className="text-xs text-muted-foreground">Relatório Gerado</p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" asChild className="gap-2">
                  <Link to={`/relatorio/${id}/teste-inconsistencias`}>Ver inconsistências (texto)</Link>
                </Button>
                <Button onClick={exportToPDF} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8" id="relatorio-content">
        {/* Resumo Geral */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Resumo Geral</h2>
            <p className="text-muted-foreground">Principais indicadores financeiros extraídos pela análise automatizada</p>
          </div>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    R$ {reportData.resumo_financeiro?.balanco_total?.toLocaleString('pt-BR') || '45.750,80'}
                  </div>
                  <p className="text-sm text-muted-foreground">Receitas totais do período</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    R$ {reportData.resumo_financeiro?.total_despesas?.toLocaleString('pt-BR') || '42.300,50'}
                  </div>
                  <p className="text-sm text-muted-foreground">Gastos totais do período</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    R$ {reportData.resumo_financeiro?.maior_gasto?.toLocaleString('pt-BR') || '15.200,00'}
                  </div>
                  <p className="text-sm text-muted-foreground">{reportData.resumo_financeiro?.categoria_maior_gasto || 'Manutenção Predial'}</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    R$ {reportData.resumo_financeiro?.saldo_final?.toLocaleString('pt-BR') || '3.450,30'}
                  </div>
                  <p className="text-sm text-muted-foreground">Resultado do período</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análise Detalhada */}
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
                  <RechartsBarChart data={reportData.distribuicao_despesas || mockRelatorio.distribuicao_despesas}>
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
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Valor']}
                    />
                    <Bar dataKey="valor" fill="#8884d8" />
                  </RechartsBarChart>
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
                  <RechartsPieChart data={reportData.distribuicao_percentual || mockRelatorio.distribuicao_percentual}>
                    <Pie
                      data={reportData.distribuicao_percentual || mockRelatorio.distribuicao_percentual}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="valor"
                      label={({ categoria, valor }) => `${categoria}: ${valor}%`}
                    >
                      {(reportData.distribuicao_percentual || mockRelatorio.distribuicao_percentual).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Inconsistências Encontradas */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Inconsistências Encontradas</h2>
            <p className="text-muted-foreground">Ressalvas e pontos de atenção identificados pela auditoria automatizada</p>
          </div>

          {inconsistencias && inconsistencias.length > 0 ? (
            <div className="space-y-4">
              {inconsistencias.map((inconsistencia, index) => (
                <Alert key={index} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="text-foreground flex-1 pr-4">
                        {inconsistencia.descricao}
                      </p>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge className={getTipoColor(inconsistencia.tipo)}>
                          {inconsistencia.tipo}
                        </Badge>
                        <Badge className={getCriticidadeColor(inconsistencia.nivel_criticidade)}>
                          {inconsistencia.nivel_criticidade === 'baixo' ? 'Baixa' :
                           inconsistencia.nivel_criticidade === 'médio' ? 'Média' : 'Alta'}
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
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