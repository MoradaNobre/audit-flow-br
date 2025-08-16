/**
 * Biblioteca para integração com Google Drive API
 * Usado para armazenar arquivos PDF grandes (>50MB)
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

class GoogleDriveStorage {
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
      // Carregar a API do Google
      await this.loadGoogleAPI();
      
      // Inicializar o cliente
      await this.gapi.load('client:auth2', async () => {
        await this.gapi.client.init({
          apiKey: this.config.apiKey,
          clientId: this.config.clientId,
          discoveryDocs: [this.config.discoveryDoc],
          scope: this.config.scope
        });
      });

      this.isInitialized = true;
      console.log('✅ Google Drive API inicializada');
    } catch (error) {
      console.error('❌ Erro ao inicializar Google Drive API:', error);
      throw error;
    }
  }

  /**
   * Carrega a API do Google dinamicamente
   */
  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        this.gapi = window.gapi;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        this.gapi = window.gapi;
        resolve();
      };
      script.onerror = reject;
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
   * Faz upload de um arquivo para o Google Drive
   */
  async uploadFile(
    file: File,
    folderId?: string,
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
      // Criar metadata do arquivo
      const metadata = {
        name: file.name,
        parents: folderId ? [folderId] : undefined,
        description: `Prestação de contas - Upload via Audit Flow BR em ${new Date().toLocaleString('pt-BR')}`
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
   * Cria uma pasta no Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.gapi.client.drive.files.create({
        resource: {
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined
        }
      });

      return response.result.id;
    } catch (error) {
      console.error('❌ Erro ao criar pasta:', error);
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
}

// Configuração padrão
export const defaultGoogleDriveConfig: GoogleDriveConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '',
  clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '',
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  scope: 'https://www.googleapis.com/auth/drive.file'
};

// Instância singleton
let googleDriveInstance: GoogleDriveStorage | null = null;

export const getGoogleDriveStorage = (): GoogleDriveStorage => {
  if (!googleDriveInstance) {
    googleDriveInstance = new GoogleDriveStorage(defaultGoogleDriveConfig);
  }
  return googleDriveInstance;
};

export default GoogleDriveStorage;
