import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreatePrestacao } from '@/hooks/usePrestacoes';
import { Condominio } from '@/hooks/useCondominios';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominios: Condominio[];
}

export const UploadModal: React.FC<UploadModalProps> = ({
  open,
  onOpenChange,
  condominios
}) => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [condominioId, setCondominioId] = useState<string>('');
  const [mes, setMes] = useState<string>('');
  const [ano, setAno] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const createPrestacao = useCreatePrestacao();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos PDF."
        });
      }
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos PDF."
        });
      }
    }
  };

  const simulateUpload = async () => {
    if (!condominioId) {
      toast({
        variant: "destructive",
        title: "Condomínio não selecionado",
        description: "Por favor, selecione um condomínio."
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simular progresso de upload
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Criar prestação no banco
      await createPrestacao.mutateAsync({
        condominio_id: condominioId,
        mes_referencia: parseInt(mes),
        ano_referencia: parseInt(ano),
        arquivo_url: `uploads/${selectedFile?.name || 'documento.pdf'}`
      });

      toast({
        title: "Upload concluído!",
        description: "A prestação de contas foi enviada para análise. Você será notificado quando estiver pronta."
      });

      // Reset form
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error.message || "Tente novamente."
      });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile || !mes || !ano || !condominioId) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos e selecione um arquivo."
      });
      return;
    }

    simulateUpload();
  };

  const resetForm = () => {
    setSelectedFile(null);
    setCondominioId('');
    setMes('');
    setAno('');
    setUploading(false);
    setUploadProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-md border-border/50 bg-card/95 backdrop-blur-sm">
        <DialogHeader>
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

        <div className="space-y-6">
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
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Enviando arquivo...</span>
                <span className="text-foreground font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading || !selectedFile || !mes || !ano || !condominioId || condominios.length === 0}
              className="flex-1 gap-2"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};