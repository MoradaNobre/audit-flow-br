/**
 * Versão simplificada da integração com Google Drive
 * Para uso em desenvolvimento quando há problemas com OAuth
 */

export interface GoogleDriveSimpleConfig {
  apiKey: string;
  publicFolderId: string;
}

export interface UploadResult {
  id: string;
  url: string;
  provider: 'googledrive';
}

export class GoogleDriveSimple {
  private config: GoogleDriveSimpleConfig;
  private isInitialized = false;

  constructor(config: GoogleDriveSimpleConfig) {
    this.config = config;
  }

  /**
   * Verifica se está em modo de desenvolvimento
   */
  static isDevelopmentMode(): boolean {
    return import.meta.env.DEV || window.location.hostname === 'localhost';
  }

  /**
   * Inicializa o sistema (completamente offline em desenvolvimento)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔄 Inicializando Google Drive (modo offline)...');
    
    if (GoogleDriveSimple.isDevelopmentMode()) {
      console.log('📱 Modo desenvolvimento detectado - inicialização offline');
      // Não carregar nenhuma API externa em desenvolvimento
      this.isInitialized = true;
      console.log('✅ Google Drive (modo offline) inicializado');
      return;
    }

    // Para produção, implementar inicialização real
    throw new Error('Inicialização para produção não implementada ainda');
  }

  /**
   * Upload offline para desenvolvimento ou via API REST para produção
   */
  async uploadFile(file: File, fileName: string): Promise<UploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (GoogleDriveSimple.isDevelopmentMode()) {
      console.log('🔄 MODO DESENVOLVIMENTO: Upload offline simulado');
      console.log('📁 Arquivo:', { 
        name: file.name, 
        size: `${Math.round(file.size / 1024 / 1024 * 100) / 100}MB`, 
        type: file.type 
      });
      
      // Simular progresso de upload realístico
      const steps = [
        { progress: 25, message: 'Preparando arquivo...' },
        { progress: 50, message: 'Simulando upload...' },
        { progress: 75, message: 'Processando...' },
        { progress: 100, message: 'Concluído!' }
      ];
      
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 400));
        console.log(`📊 ${step.progress}% - ${step.message}`);
      }
      
      // Gerar resultado simulado realístico
      const simulatedId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const simulatedUrl = `https://drive.google.com/file/d/${simulatedId}/view`;
      
      console.log('✅ Upload offline concluído:', { 
        id: simulatedId, 
        url: simulatedUrl,
        downloadUrl: this.getDownloadUrl(simulatedId)
      });
      
      return {
        id: simulatedId,
        url: simulatedUrl,
        provider: 'googledrive'
      };
    }

    // Para produção, implementar upload real via API REST
    throw new Error('Upload real via API REST não implementado ainda. Use modo desenvolvimento.');
  }

  /**
   * Gera URL de download direto
   */
  getDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }


}

// Instância padrão para uso fácil
export const googleDriveSimple = new GoogleDriveSimple({
  apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '',
  publicFolderId: '11L-81p6tu0KiXo0vd_TDeaJWHOHXt1Hs'
});
