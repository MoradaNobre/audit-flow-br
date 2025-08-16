/**
 * Sistema de Storage APENAS Google Drive
 * Todos os PDFs são armazenados na pasta pública do Google Drive
 */

// Declarações de tipo para Google API
declare global {
  interface Window {
    gapi: any;
  }
}

export interface GoogleDriveConfig {
  apiKey: string;
  clientId: string;
  discoveryDoc: string;
  scope: string;
  publicFolderId: string; // ID da pasta pública
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  size: string;
  createdTime: string;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class GoogleDriveOnlyStorage {
  private gapi: any;
  private isInitialized = false;
  private config: GoogleDriveConfig;

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  /**
   * Inicializa a API do Google Drive
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Inicializando Google Drive API...');
      console.log('Config:', {
        apiKey: this.config.apiKey ? '✅ Definida' : '❌ Não definida',
        clientId: this.config.clientId ? '✅ Definida' : '❌ Não definida',
        discoveryDoc: this.config.discoveryDoc,
        scope: this.config.scope
      });

      // Verificar se as chaves estão configuradas
      if (!this.config.apiKey) {
        throw new Error('VITE_GOOGLE_DRIVE_API_KEY não está configurada no arquivo .env');
      }
      if (!this.config.clientId) {
        throw new Error('VITE_GOOGLE_DRIVE_CLIENT_ID não está configurada no arquivo .env');
      }

      // Carregar a API do Google
      console.log('🔄 Carregando Google API...');
      await this.loadGoogleAPI();
      console.log('✅ Google API carregada');
      
      // Inicializar o cliente
      console.log('🔄 Inicializando cliente Google...');
      await new Promise<void>((resolve, reject) => {
        this.gapi.load('client:auth2', async () => {
          try {
            console.log('🔄 Configurando cliente...');
            await this.gapi.client.init({
              apiKey: this.config.apiKey,
              clientId: this.config.clientId,
              discoveryDocs: [this.config.discoveryDoc],
              scope: this.config.scope
            });
            console.log('✅ Cliente configurado');
            resolve();
          } catch (error) {
            console.error('❌ Erro ao configurar cliente:', error);
            reject(error);
          }
        });
      });

      this.isInitialized = true;
      console.log('✅ Google Drive API inicializada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar Google Drive API:', error);
      console.error('Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        config: this.config
      });
      throw error;
    }
  }

  /**
   * Carrega a API do Google dinamicamente
   */
  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verificar se já está carregada
      if (window.gapi) {
        console.log('✅ Google API já carregada');
        this.gapi = window.gapi;
        resolve();
        return;
      }

      console.log('🔄 Carregando script da Google API...');
      
      // Timeout de 10 segundos
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao carregar Google API. Verifique sua conexão com a internet.'));
      }, 10000);

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        clearTimeout(timeout);
        console.log('✅ Script da Google API carregado');
        
        // Aguardar um pouco para garantir que gapi esteja disponível
        setTimeout(() => {
          if (window.gapi) {
            this.gapi = window.gapi;
            resolve();
          } else {
            reject(new Error('Google API não está disponível após carregar o script'));
          }
        }, 100);
      };
      
      script.onerror = (error) => {
        clearTimeout(timeout);
        console.error('❌ Erro ao carregar script da Google API:', error);
        reject(new Error('Falha ao carregar script da Google API. Verifique sua conexão.'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Autentica o usuário com Google
   */
  async authenticate(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      
      if (authInstance.isSignedIn.get()) {
        return true;
      }

      await authInstance.signIn();
      return true;
    } catch (error) {
      console.error('❌ Erro na autenticação Google:', error);
      return false;
    }
  }

  /**
   * Faz upload de um arquivo para a pasta pública do Google Drive
   */
  async uploadFile(
    file: File,
    condominioId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<GoogleDriveFile> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const isAuthenticated = await this.authenticate();
    if (!isAuthenticated) {
      throw new Error('Falha na autenticação com Google Drive');
    }

    try {
      // Criar nome do arquivo com timestamp e condomínio
      const timestamp = Date.now();
      const fileName = `${condominioId}_${timestamp}_${file.name}`;

      // Criar metadata do arquivo
      const metadata = {
        name: fileName,
        parents: [this.config.publicFolderId], // Pasta pública específica
        description: `Prestação de contas - ${condominioId} - Upload via Audit Flow BR em ${new Date().toLocaleString('pt-BR')}`
      };

      // Preparar form data
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      // Upload com progress tracking
      const response = await this.uploadWithProgress(form, onProgress);
      
      console.log('✅ Arquivo enviado para Google Drive:', response);
      return response;
    } catch (error) {
      console.error('❌ Erro no upload para Google Drive:', error);
      throw error;
    }
  }

  /**
   * Upload com tracking de progresso
   */
  private uploadWithProgress(
    formData: FormData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<GoogleDriveFile> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Configurar headers de autenticação
      const token = this.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          };
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Erro ao processar resposta do Google Drive'));
          }
        } else {
          reject(new Error(`Erro HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Erro de rede durante upload'));
      });

      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  /**
   * Obtém informações de um arquivo
   */
  async getFileInfo(fileId: string): Promise<GoogleDriveFile> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id,name,webViewLink,webContentLink,size,createdTime,mimeType'
      });

      return response.result;
    } catch (error) {
      console.error('❌ Erro ao obter informações do arquivo:', error);
      throw error;
    }
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    if (!this.isInitialized) return false;
    
    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      return authInstance.isSignedIn.get();
    } catch {
      return false;
    }
  }

  /**
   * Faz logout
   */
  async signOut(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      console.log('✅ Logout do Google Drive realizado');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    }
  }

  /**
   * Obtém URL de download direto
   */
  getDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * Obtém URL de visualização
   */
  getViewUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}

// Configuração com a pasta pública fornecida
export const googleDriveConfig: GoogleDriveConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '',
  clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '',
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  scope: 'https://www.googleapis.com/auth/drive.file',
  publicFolderId: '11L-81p6tu0KiXo0vd_TDeaJWHOHXt1Hs' // ID extraído do link fornecido
};

// Instância singleton
let googleDriveInstance: GoogleDriveOnlyStorage | null = null;

export const getGoogleDriveStorage = (): GoogleDriveOnlyStorage => {
  if (!googleDriveInstance) {
    googleDriveInstance = new GoogleDriveOnlyStorage(googleDriveConfig);
  }
  return googleDriveInstance;
};

export default GoogleDriveOnlyStorage;
