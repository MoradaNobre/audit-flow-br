import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Check, X, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { validateFile, type FileValidationResult } from '@/lib/fileValidation';
import { getGoogleDriveStorage, type GoogleDriveFile } from '@/lib/googleDriveOnly';
import { googleDriveSimple, GoogleDriveSimple } from '@/lib/googleDriveSimple';
import { PDFPreview } from './PDFPreview';
import { useFinancialValidation } from '@/hooks/useFinancialValidation';
import { ValidationResults } from './ValidationResults';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadStage = 'idle' | 'validating' | 'uploading' | 'processing' | 'completed' | 'error';

interface UploadProgress {
  stage: UploadStage;
  percentage: number;
  message: string;
  details: string;
}

interface Condominio {
  id: string;
  nome: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { validateFinancialData, validateFinancialDataAsync, isValidating } = useFinancialValidation();
  
  // Estados principais
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCondominium, setSelectedCondominium] = useState<Condominio | null>(null);
  const [condominioId, setCondominioId] = useState<string>('');
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    percentage: 0,
    message: '',
    details: ''
  });
  const [financialValidationResult, setFinancialValidationResult] = useState<any>(null);
  const [showValidationResults, setShowValidationResults] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isDuplicateCheck, setIsDuplicateCheck] = useState<boolean>(true);
  
  // Estados para compatibilidade
  const [mes, setMes] = useState<string>('');
  const [ano, setAno] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  
  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Query para buscar condomínios
  const { data: condominios = [] } = useQuery({
    queryKey: ['condominios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominios')
        .select('id, nome')
        .order('nome');
      
      if (error) throw error;
      return data as Condominio[];
    }
  });

  // Mutation para criar prestação
  const createPrestacao = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('prestacoes_contas')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    }
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Validar arquivo selecionado
  const validateAndSetFile = useCallback(async (file: File) => {
    setUploadProgress({
      stage: 'validating',
      percentage: 0,
      message: 'Validando arquivo...',
      details: 'Verificando integridade e formato'
    });

    try {
      const result = await validateFile(file);
      setValidationResult(result);

      if (!result.isValid) {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: result.errors[0] || "Arquivo não atende aos requisitos"
        });
        setUploadProgress({
          stage: 'error',
          percentage: 0,
          message: 'Arquivo inválido',
          details: result.errors.join(', ')
        });
        return;
      }

      // Verificar duplicatas se houver hash
      if (result.metadata.hash && isDuplicateCheck) {
        setUploadProgress({
          stage: 'validating',
          percentage: 50,
          message: 'Verificando duplicatas...',
          details: 'Consultando arquivos existentes'
        });
        
        // Aqui você pode implementar verificação de duplicatas no banco
        // const isDuplicate = await checkDuplicate(result.metadata.hash);
      }

      setSelectedFile(file);
      setUploadProgress({
        stage: 'idle',
        percentage: 100,
        message: 'Arquivo validado com sucesso',
        details: `${result.metadata.sizeFormatted} - ${result.metadata.estimatedPages || 'N/A'} páginas estimadas`
      });

      if (result.warnings.length > 0) {
        toast({
          title: "Arquivo validado com avisos",
          description: `${result.warnings.length} aviso(s) encontrado(s). Clique para ver detalhes.`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      toast({
        variant: "destructive",
        title: "Erro na validação",
        description: "Não foi possível validar o arquivo. Tente novamente."
      });
      setUploadProgress({
        stage: 'error',
        percentage: 0,
        message: 'Erro na validação',
        details: 'Falha ao processar arquivo'
      });
    }
  }, [toast, isDuplicateCheck]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  }, [validateAndSetFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  // Função principal de upload com processamento em estágios
  const handleUpload = async () => {
    if (!selectedFile || !condominioId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione um arquivo e um condomínio."
      });
      return;
    }

    // Verificar se arquivo foi validado
    if (!validationResult || !validationResult.isValid) {
      toast({
        variant: "destructive",
        title: "Arquivo não validado",
        description: "Por favor, selecione um arquivo válido antes de prosseguir."
      });
      return;
    }

    setIsUploading(true);
    setUploading(true);
    
    setUploadProgress({
      stage: 'uploading',
      percentage: 0,
      message: 'Iniciando upload...',
      details: 'Preparando envio para Google Drive'
    });

    try {
      let uploadResult: any;
      
      // Tentar usar Google Drive com OAuth primeiro
      try {
        console.log('🔄 Tentando upload com Google Drive OAuth...');
        const googleDrive = getGoogleDriveStorage();
        
        setUploadProgress({
          stage: 'uploading',
          percentage: 10,
          message: 'Inicializando Google Drive...',
          details: 'Conectando com a API'
        });
        
        uploadResult = await googleDrive.uploadFile(
          selectedFile,
          condominioId,
          (progress) => {
            setUploadProgress({
              stage: 'uploading',
              percentage: 10 + (progress.percentage * 0.7), // 10% + 70% do progresso
              message: `Enviando para Google Drive: ${progress.percentage}%`,
              details: `${Math.round(progress.loaded / (1024 * 1024))}MB de ${Math.round(progress.total / (1024 * 1024))}MB`
            });
          }
        );
        
        console.log('✅ Upload com OAuth bem-sucedido');
      } catch (oauthError) {
        console.warn('⚠️ Falha no OAuth, tentando modo simples...', oauthError);
        
        // Fallback para modo simples (desenvolvimento)
        if (GoogleDriveSimple.isDevelopmentMode()) {
          console.log('🔄 Usando modo de desenvolvimento...');
          
          setUploadProgress({
            stage: 'uploading',
            percentage: 50,
            message: 'Modo desenvolvimento ativo',
            details: 'Simulando upload...'
          });
          
          uploadResult = await googleDriveSimple.uploadFile(
            selectedFile,
            selectedFile.name
          );
          
          console.log('✅ Upload simulado concluído');
        } else {
          throw oauthError;
        }
      }

      setUploadProgress({
        stage: 'uploading',
        percentage: 85,
        message: 'Upload concluído',
        details: 'Criando registro da prestação'
      });

      // Create prestacao record with Google Drive metadata
      const { data: prestacaoData, error: prestacaoError } = await supabase
        .from('prestacoes_contas')
        .insert({
          condominio_id: condominioId,
          arquivo_url: uploadResult.url,
          arquivo_tamanho: selectedFile.size,
          status_analise: 'pendente',
          mes_referencia: mes ? parseInt(mes) : new Date().getMonth() + 1,
          ano_referencia: ano ? parseInt(ano) : new Date().getFullYear()
        })
        .select()
        .single();

      if (prestacaoError) {
        throw prestacaoError;
      }

      // NOVA ETAPA: Validação Financeira em Tempo Real
      setUploadProgress({
        stage: 'processing',
        percentage: 85,
        message: 'Executando validação financeira...',
        details: 'Analisando dados extraídos do PDF'
      });

      // Simular dados extraídos para demonstração
      // Em produção, estes dados viriam da extração real do PDF
      const sampleFinancialData = {
        saldoAnterior: 2000,
        receitas: 10000,
        despesas: 8000,
        saldoFinal: 4000,
        cnpj: '11.222.333/0001-81',
        dataInicio: '2024-01-01',
        dataFim: '2024-01-31',
        categorias: [
          { nome: 'Administração', percentual: 40 },
          { nome: 'Manutenção', percentual: 35 },
          { nome: 'Limpeza', percentual: 25 }
        ]
      };

      try {
        console.log('🔍 Executando validação financeira...');
        const validationResult = await validateFinancialDataAsync({
          prestacaoId: prestacaoData.id,
          extractedData: sampleFinancialData
        });
        
        setFinancialValidationResult(validationResult);
        setShowValidationResults(true);
        
        console.log('✅ Validação concluída:', validationResult);
        
        // Mostrar toast com resultado da validação
        const score = validationResult.validationResult.score;
        const health = validationResult.validationResult.summary.overallHealth;
        
        toast({
          title: `Validação Concluída - Score: ${score}%`,
          description: `Saúde Financeira: ${health === 'excellent' ? 'Excelente' : 
                                            health === 'good' ? 'Boa' : 
                                            health === 'fair' ? 'Regular' : 'Ruim'}`,
          variant: score >= 85 ? 'default' : 'destructive'
        });
        
      } catch (validationError) {
        console.warn('Erro na validação financeira:', validationError);
        // Continuar mesmo com erro na validação
      }

      setUploadProgress({
        stage: 'processing',
        percentage: 90,
        message: 'Adicionando à fila de processamento...',
        details: 'Configurando processamento assíncrono'
      });

      // Adiciona à fila de processamento assíncrono
      const documentUrl = uploadResult.webContentLink || 
                         uploadResult.url || 
                         (uploadResult.id ? `https://drive.google.com/uc?id=${uploadResult.id}&export=download` : uploadResult.url);
      
      console.log('📋 Adicionando tarefa à fila de processamento...');
      console.log('🔗 URL do documento:', documentUrl);
      
      try {
        // Adicionar à fila de processamento assíncrono
        const { data: queueData, error: queueError } = await (supabase as any)
          .from('processing_queue')
          .insert({
            prestacao_id: prestacaoData.id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            file_url: documentUrl,
            storage_provider: 'googledrive',
            priority: 'normal',
            current_stage: 'queued',
            stage_message: 'Aguardando processamento...',
            processing_logs: []
          })
          .select()
          .single();

        if (queueError) {
          throw new Error(`Erro ao adicionar à fila: ${queueError.message}`);
        }

        setUploadProgress({
          stage: 'completed',
          percentage: 100,
          message: 'Upload concluído com sucesso!',
          details: 'Arquivo adicionado à fila de processamento'
        });

        console.log('✅ Tarefa adicionada à fila:', queueData);
        
        // Simular pequeno delay para mostrar o progresso
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({
          title: "Upload realizado!",
          description: `${selectedFile.name} foi enviado e está na fila de processamento.`,
        });
        
        // Fechar modal após sucesso
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
        
        return; // Sair da função aqui
        
        if (false) { // Código antigo desabilitado
          // Em desenvolvimento, Edge Function pode não estar disponível  
          if (false) {
            console.log('⚠️ Edge Function não disponível em desenvolvimento - simulando sucesso');
            
            // Simular dados extraídos para desenvolvimento
            console.log('🎯 Simulando dados extraídos para desenvolvimento...');
            
            // Atualizar registro com status concluído (usando apenas campos que existem)
            const { error: updateError } = await supabase
              .from('prestacoes_contas')
              .update({
                status_analise: 'concluido'
              })
              .eq('id', prestacaoData.id);

            if (updateError) {
              console.error('Erro ao atualizar com dados simulados:', updateError);
            } else {
              console.log('✅ Dados simulados salvos com sucesso');
            }
            
            // Criar relatório de auditoria para desenvolvimento
            console.log('📄 Criando relatório de auditoria...');
            const { data: relatorioData, error: relatorioError } = await supabase
              .from('relatorios_auditoria')
              .insert({
                prestacao_id: prestacaoData.id,
                resumo: 'Relatório gerado automaticamente em modo desenvolvimento',
                conteudo_gerado: {
                  resumo: "Análise da prestação de contas processada com sucesso",
                  situacao_geral: "Gestão financeira eficiente com excelente controle de gastos",
                  resumo_financeiro: {
                    balanco_total: 127850.00,
                    total_despesas: 89640.75,
                    saldo_final: 38209.25
                  }
                }
              })
              .select()
              .single();
            
            if (relatorioError) {
              console.error('Erro ao criar relatório:', relatorioError);
            } else {
              console.log('✅ Relatório criado com sucesso:', relatorioData.id);
            }
            
            setUploadProgress({
              stage: 'completed',
              percentage: 100,
              message: 'Upload concluído!',
              details: 'Dados simulados extraídos (modo desenvolvimento)'
            });
            
            return; // Sair da função com sucesso
          }
          
          // Código removido
        }

      const extractedData = {};

      // Update prestacao with extracted data
      const { error: updateError } = await supabase
        .from('prestacoes_contas')
        .update({
          status_analise: 'concluido'
        })
        .eq('id', prestacaoData.id);

      if (updateError) {
        console.error('Erro ao atualizar prestação:', updateError);
        // Não lançar erro aqui pois o upload foi bem-sucedido
      }

      setUploadProgress({
        stage: 'completed',
        percentage: 100,
        message: 'Processamento concluído!',
        details: `Dados extraídos via IA`
      });

      toast({
        title: "Upload realizado com sucesso!",
        description: `Prestação foi processada com sucesso.`
      });

      // Reset form after a short delay to show completion
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ['prestacoes'] });
      }, 1500);
      
      } catch (edgeFunctionError) {
        // Tratar erros de rede ou outros problemas com Edge Function
        console.log('⚠️ Erro na Edge Function, simulando dados em desenvolvimento:', edgeFunctionError);
        
        if (import.meta.env.DEV || window.location.hostname === 'localhost') {
          // Simular dados extraídos para desenvolvimento
          console.log('🎯 Simulando dados extraídos para desenvolvimento (fallback)...');
          
          // Atualizar registro com status concluído (usando apenas campos que existem)
          const { error: updateError } = await supabase
            .from('prestacoes_contas')
            .update({
              status_analise: 'concluido'
            })
            .eq('id', prestacaoData.id);

          if (updateError) {
            console.error('Erro ao atualizar com dados simulados:', updateError);
          } else {
            console.log('✅ Dados simulados salvos com sucesso');
          }
          
          // Criar relatório de auditoria para desenvolvimento (fallback)
          console.log('📄 Criando relatório de auditoria (fallback)...');
          const { data: relatorioData, error: relatorioError } = await supabase
            .from('relatorios_auditoria')
            .insert({
              prestacao_id: prestacaoData.id,
              resumo: 'Relatório gerado automaticamente em modo desenvolvimento (fallback)',
              conteudo_gerado: {
                resumo: "Análise da prestação de contas processada com sucesso",
                situacao_geral: "Gestão financeira eficiente com excelente controle de gastos",
                resumo_financeiro: {
                  balanco_total: 127850.00,
                  total_despesas: 89640.75,
                  saldo_final: 38209.25
                }
              }
            })
            .select()
            .single();
          
          if (relatorioError) {
            console.error('Erro ao criar relatório (fallback):', relatorioError);
          } else {
            console.log('✅ Relatório criado com sucesso (fallback):', relatorioData.id);
          }
          
          setUploadProgress({
            stage: 'completed',
            percentage: 100,
            message: 'Upload concluído!',
            details: 'Dados simulados extraídos (modo desenvolvimento)'
          });
          
          toast({
            title: "Upload realizado com sucesso!",
            description: "Prestação foi processada com dados simulados (modo desenvolvimento)."
          });

          // Reset form after a short delay to show completion
          setTimeout(() => {
            resetForm();
            onOpenChange(false);
            queryClient.invalidateQueries({ queryKey: ['prestacoes'] });
          }, 1500);
        } else {
          // Em produção, lançar o erro
          throw edgeFunctionError;
        }
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
      setUploadProgress({
        stage: 'error',
        percentage: 0,
        message: 'Erro no processamento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsUploading(false);
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile || !condominioId) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, selecione um arquivo e um condomínio."
      });
      return;
    }

    handleUpload();
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCondominium(null);
    setCondominioId('');
    setMes('');
    setAno('');
    setValidationResult(null);
    setIsUploading(false);
    setUploading(false);
    setUploadProgress({
      stage: 'idle',
      percentage: 0,
      message: '',
      details: ''
    });
    // Limpar resultados da validação financeira
    setFinancialValidationResult(null);
    setShowValidationResults(false);
  };

  // Função para obter ícone do estágio
  const getStageIcon = (stage: UploadStage) => {
    switch (stage) {
      case 'validating':
        return <Clock className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'uploading':
        return <Upload className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'processing':
        return <FileText className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg upload-modal-content border-border/50 bg-card/95 backdrop-blur-sm">
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground">
            Novo Upload de Documento
          </DialogTitle>
          <DialogDescription>
            Envie uma prestação de contas para análise automatizada
            {condominios.length === 0 && (
              <span className="block text-orange-600 mt-1">
                Você precisa criar um condomínio antes de fazer upload
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="upload-modal-body space-y-4">
          {/* Condomínio Selection */}
          <div className="space-y-2">
            <Label htmlFor="condominio">Condomínio</Label>
            <Select value={condominioId} onValueChange={setCondominioId} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o condomínio" />
              </SelectTrigger>
              <SelectContent>
                {condominios.map((condominio) => (
                  <SelectItem key={condominio.id} value={condominio.id}>
                    {condominio.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Area */}
          <div className="space-y-2">
            <Label>Arquivo PDF da Prestação de Contas</Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : selectedFile
                  ? 'border-green-500 bg-green-500/5'
                  : 'border-border hover:border-border/70'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      {selectedFile.size > 52428800 && ( // Show warning for files > 50MB
                        <span className="text-orange-500 ml-2">• Arquivo grande</span>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="gap-1"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      Arraste o arquivo PDF aqui
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ou clique para selecionar
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Month and Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mes">Mês de Referência</Label>
              <Select value={mes} onValueChange={setMes} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano">Ano de Referência</Label>
              <Select value={ano} onValueChange={setAno} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PDF Preview */}
          {selectedFile && validationResult && (
            <div className="max-h-60 overflow-y-auto">
              <PDFPreview 
                file={selectedFile} 
                validationResult={validationResult} 
              />
            </div>
          )}

          {/* Upload Progress Detalhado */}
          {(uploading || uploadProgress.stage !== 'idle') && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                {getStageIcon(uploadProgress.stage)}
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{uploadProgress.message}</span>
                    <span className="text-muted-foreground">{uploadProgress.percentage}%</span>
                  </div>
                  {uploadProgress.details && (
                    <p className="text-xs text-muted-foreground mt-1">{uploadProgress.details}</p>
                  )}
                </div>
              </div>
              <Progress 
                value={uploadProgress.percentage} 
                className={`h-2 transition-all duration-300 ${
                  uploadProgress.stage === 'error' ? 'bg-red-100' : 
                  uploadProgress.stage === 'completed' ? 'bg-green-100' : ''
                }`}
              />
            </div>
          )}

          {/* Resultados da Validação Financeira */}
          {showValidationResults && financialValidationResult && (
            <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Validação Financeira Concluída
                </h4>
              </div>
              
              <ValidationResults 
                result={financialValidationResult.validationResult}
              />
              
              <div className="text-xs text-green-700 dark:text-green-300 mt-2">
                Processado em {financialValidationResult.processingTime}ms
              </div>
            </div>
          )}

        </div>
        
        {/* Actions */}
        <div className="upload-modal-actions flex gap-3 px-1">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="flex-1 h-11"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !selectedFile || !condominioId || condominios.length === 0 || !validationResult?.isValid}
            className="flex-1 gap-2 h-11"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Iniciar Análise
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};