/**
 * Sistema de Storage Híbrido
 * Decide automaticamente entre Supabase (≤50MB) e Google Drive (>50MB)
 */

import { supabase } from '@/integrations/supabase/client';
import { getGoogleDriveStorage, type GoogleDriveFile } from './googleDriveStorage';

export type StorageProvider = 'supabase' | 'googledrive';

export interface HybridStorageResult {
  provider: StorageProvider;
  url: string;
  fileId?: string;
  path?: string;
  metadata: {
    size: number;
    name: string;
    type: string;
    uploadedAt: string;
  };
}

export interface UploadProgress {
  stage: 'validating' | 'uploading' | 'processing' | 'completed';
  percentage: number;
  provider: StorageProvider;
  message: string;
}

class HybridStorage {
  private readonly SUPABASE_LIMIT = 50 * 1024 * 1024; // 50MB
  private readonly BUCKET_NAME = 'prestacoes-pdf';

  /**
   * Decide qual provider usar baseado no tamanho do arquivo
   */
  private getProviderForFile(file: File): StorageProvider {
    return file.size <= this.SUPABASE_LIMIT ? 'supabase' : 'googledrive';
  }

  /**
   * Upload para Supabase Storage
   */
  private async uploadToSupabase(
    file: File,
    filePath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<HybridStorageResult> {
    try {
      onProgress?.({
        stage: 'uploading',
        percentage: 10,
        provider: 'supabase',
        message: 'Enviando para Supabase Storage...'
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Erro no upload Supabase: ${uploadError.message}`);
      }

      onProgress?.({
        stage: 'uploading',
        percentage: 80,
        provider: 'supabase',
        message: 'Obtendo URL pública...'
      });

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(uploadData.path);

      onProgress?.({
        stage: 'completed',
        percentage: 100,
        provider: 'supabase',
        message: 'Upload concluído no Supabase'
      });

      return {
        provider: 'supabase',
        url: publicUrlData.publicUrl,
        path: uploadData.path,
        metadata: {
          size: file.size,
          name: file.name,
          type: file.type,
          uploadedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Erro no upload Supabase:', error);
      throw error;
    }
  }

  /**
   * Upload para Google Drive
   */
  private async uploadToGoogleDrive(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<HybridStorageResult> {
    try {
      onProgress?.({
        stage: 'uploading',
        percentage: 5,
        provider: 'googledrive',
        message: 'Inicializando Google Drive...'
      });

      const googleDrive = getGoogleDriveStorage();
      
      // Inicializar e autenticar
      await googleDrive.initialize();
      const isAuth = await googleDrive.authenticate();
      
      if (!isAuth) {
        throw new Error('Falha na autenticação com Google Drive');
      }

      onProgress?.({
        stage: 'uploading',
        percentage: 15,
        provider: 'googledrive',
        message: 'Enviando arquivo grande para Google Drive...'
      });

      // Upload com progress tracking
      const driveFile = await googleDrive.uploadFile(file, undefined, (progress) => {
        onProgress?.({
          stage: 'uploading',
          percentage: 15 + (progress.percentage * 0.7), // 15% + 70% do progresso
          provider: 'googledrive',
          message: `Enviando: ${progress.percentage}%`
        });
      });

      onProgress?.({
        stage: 'completed',
        percentage: 100,
        provider: 'googledrive',
        message: 'Upload concluído no Google Drive'
      });

      return {
        provider: 'googledrive',
        url: driveFile.webViewLink,
        fileId: driveFile.id,
        metadata: {
          size: file.size,
          name: file.name,
          type: file.type,
          uploadedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Erro no upload Google Drive:', error);
      throw error;
    }
  }

  /**
   * Upload principal - decide automaticamente o provider
   */
  async upload(
    file: File,
    condominioId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<HybridStorageResult> {
    const provider = this.getProviderForFile(file);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;

    onProgress?.({
      stage: 'validating',
      percentage: 0,
      provider,
      message: `Arquivo será enviado para ${provider === 'supabase' ? 'Supabase' : 'Google Drive'}`
    });

    try {
      if (provider === 'supabase') {
        const filePath = `prestacoes/${condominioId}/${fileName}`;
        return await this.uploadToSupabase(file, filePath, onProgress);
      } else {
        return await this.uploadToGoogleDrive(file, onProgress);
      }
    } catch (error) {
      onProgress?.({
        stage: 'validating',
        percentage: 0,
        provider,
        message: `Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
      throw error;
    }
  }

  /**
   * Obtém informações sobre limites de storage
   */
  getStorageInfo(fileSize: number) {
    const provider = fileSize <= this.SUPABASE_LIMIT ? 'supabase' : 'googledrive';
    const isLarge = fileSize > this.SUPABASE_LIMIT;
    
    return {
      provider,
      isLarge,
      sizeLimit: this.SUPABASE_LIMIT,
      sizeMB: Math.round(fileSize / (1024 * 1024) * 100) / 100,
      limitMB: Math.round(this.SUPABASE_LIMIT / (1024 * 1024)),
      message: isLarge 
        ? `Arquivo grande (${Math.round(fileSize / (1024 * 1024))}MB) será enviado para Google Drive`
        : `Arquivo pequeno (${Math.round(fileSize / (1024 * 1024))}MB) será enviado para Supabase`
    };
  }

  /**
   * Verifica se o Google Drive está disponível
   */
  async isGoogleDriveAvailable(): Promise<boolean> {
    try {
      const googleDrive = getGoogleDriveStorage();
      await googleDrive.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém URL de download baseado no provider
   */
  getDownloadUrl(result: HybridStorageResult): string {
    if (result.provider === 'supabase') {
      return result.url;
    } else {
      // Para Google Drive, usar webContentLink se disponível
      return result.url.replace('/view', '/export?format=pdf');
    }
  }
}

// Instância singleton
let hybridStorageInstance: HybridStorage | null = null;

export const getHybridStorage = (): HybridStorage => {
  if (!hybridStorageInstance) {
    hybridStorageInstance = new HybridStorage();
  }
  return hybridStorageInstance;
};

export default HybridStorage;
