/**
 * Componente para exibir informações sobre o sistema de storage híbrido
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Database, HardDrive, Info } from 'lucide-react';

interface StorageInfoProps {
  fileSize: number;
  className?: string;
}

export const StorageInfo: React.FC<StorageInfoProps> = ({ fileSize, className }) => {
  const sizeMB = Math.round(fileSize / (1024 * 1024) * 100) / 100;
  const isLarge = fileSize > 50 * 1024 * 1024; // 50MB
  const provider = isLarge ? 'googledrive' : 'supabase';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4" />
          Sistema de Storage Híbrido
        </CardTitle>
        <CardDescription className="text-xs">
          Otimização automática baseada no tamanho do arquivo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tamanho do arquivo:</span>
          <Badge variant="outline">{sizeMB} MB</Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Storage utilizado:</span>
          <div className="flex items-center gap-2">
            {provider === 'supabase' ? (
              <>
                <Database className="h-4 w-4 text-green-600" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Supabase
                </Badge>
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 text-blue-600" />
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  Google Drive
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-green-600" />
              <span>Supabase: Arquivos até 50MB (rápido e otimizado)</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="h-3 w-3 text-blue-600" />
              <span>Google Drive: Arquivos grandes &gt;50MB (ilimitado)</span>
            </div>
          </div>
        </div>

        {isLarge && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Arquivo grande detectado</p>
                <p>Este arquivo será armazenado no Google Drive para otimizar performance e custos.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StorageInfo;
