import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  HardDrive,
  Hash,
  Calendar,
  Cloud
} from 'lucide-react';
import { FileMetadata, FileValidationResult } from '@/lib/fileValidation';
import { formatFileSize } from '@/lib/fileValidation';


interface PDFPreviewProps {
  file: File;
  validationResult: FileValidationResult;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  className?: string;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  file,
  validationResult,
  showPreview = false,
  onTogglePreview,
  className = '',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { metadata, errors, warnings, isValid } = validationResult;

  // Gerar URL de preview quando necessário
  useEffect(() => {
    if (showPreview && !previewUrl && isValid) {
      setIsLoadingPreview(true);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setIsLoadingPreview(false);

      // Cleanup
      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    }
  }, [showPreview, file, isValid, previewUrl]);

  // Determinar cor do status
  const getStatusColor = () => {
    if (!isValid) return 'bg-red-500/10 text-red-700 border-red-500/20';
    if (warnings.length > 0) return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    return 'bg-green-500/10 text-green-700 border-green-500/20';
  };

  // Determinar ícone do status
  const getStatusIcon = () => {
    if (!isValid) return <AlertTriangle className="h-4 w-4" />;
    if (warnings.length > 0) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  // Determinar texto do status
  const getStatusText = () => {
    if (!isValid) return 'Inválido';
    if (warnings.length > 0) return 'Válido com avisos';
    return 'Válido';
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <FileText className="h-8 w-8 text-blue-600 mt-1" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-medium truncate">
                {metadata.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className={getStatusColor()}>
                  {getStatusIcon()}
                  <span className="ml-1">{getStatusText()}</span>
                </Badge>
                {metadata.estimatedPages && (
                  <Badge variant="secondary">
                    ~{metadata.estimatedPages} páginas
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {onTogglePreview && isValid && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePreview}
              className="shrink-0"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metadata do arquivo */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Tamanho:</span>
            <span className="font-medium">{metadata.sizeFormatted}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Modificado:</span>
            <span className="font-medium">
              {new Date(metadata.lastModified).toLocaleDateString('pt-BR')}
            </span>
          </div>
          {metadata.hash && (
            <div className="flex items-center space-x-2 col-span-2">
              <Hash className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Hash:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {metadata.hash.substring(0, 16)}...
              </span>
            </div>
          )}
        </div>

        {/* Barra de progresso visual do tamanho */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Uso do limite de tamanho</span>
            <span className="text-gray-600">
              {((metadata.size / (100 * 1024 * 1024)) * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={(metadata.size / (100 * 1024 * 1024)) * 100} 
            className="h-2"
          />
        </div>

        {/* Informações sobre Google Drive */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center gap-2 text-blue-800">
            <Cloud className="h-4 w-4" />
            <span className="text-sm font-medium">Armazenamento: Google Drive</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Todos os arquivos são armazenados na pasta pública do Google Drive
          </p>
        </div>

        {/* Erros */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-700 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Erros encontrados:
            </h4>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Avisos */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-yellow-700 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Avisos:
            </h4>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview do PDF */}
        {showPreview && isValid && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Preview:</h4>
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Carregando preview...</p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="border rounded overflow-hidden">
                <iframe
                  src={`${previewUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-64"
                  title={`Preview de ${metadata.name}`}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded">
                <p className="text-sm text-gray-600">Preview não disponível</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente para lista de previews
interface PDFPreviewListProps {
  files: File[];
  validationResults: FileValidationResult[];
  className?: string;
}

export const PDFPreviewList: React.FC<PDFPreviewListProps> = ({
  files,
  validationResults,
  className = '',
}) => {
  const [expandedPreviews, setExpandedPreviews] = useState<Set<number>>(new Set());

  const togglePreview = (index: number) => {
    const newExpanded = new Set(expandedPreviews);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPreviews(newExpanded);
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {files.map((file, index) => (
        <PDFPreview
          key={`${file.name}-${file.lastModified}`}
          file={file}
          validationResult={validationResults[index]}
          showPreview={expandedPreviews.has(index)}
          onTogglePreview={() => togglePreview(index)}
        />
      ))}
    </div>
  );
};
