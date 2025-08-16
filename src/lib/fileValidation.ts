/**
 * Biblioteca para validação robusta de arquivos PDF
 * Implementa verificações de integridade, tipo MIME, tamanho e metadata
 */

// Configurações de validação
export const FILE_VALIDATION_CONFIG = {
  maxSizeBytes: 500 * 1024 * 1024, // 500MB (limite máximo Google Drive)
  minSizeBytes: 1024, // 1KB mínimo
  allowedMimeTypes: ['application/pdf'] as string[],
  allowedExtensions: ['.pdf'] as string[],
  maxFileNameLength: 255,
} as const;

// Tipos para validação
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: FileMetadata;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  extension: string;
  sizeFormatted: string;
  hash?: string;
  isPDF: boolean;
  estimatedPages?: number;
}

// Função para calcular hash do arquivo (para detecção de duplicatas)
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Função para formatar tamanho do arquivo
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Função para extrair metadata do arquivo
export function extractFileMetadata(file: File): FileMetadata {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase() || '';
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    extension,
    sizeFormatted: formatFileSize(file.size),
    isPDF: file.type === 'application/pdf' || extension === '.pdf',
  };
}

// Função para verificar se o arquivo é realmente um PDF (magic bytes)
export async function verifyPDFIntegrity(file: File): Promise<boolean> {
  try {
    // Ler os primeiros bytes do arquivo
    const chunk = file.slice(0, 8);
    const buffer = await chunk.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // PDF magic bytes: %PDF-
    const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-
    
    // Verificar se os primeiros bytes correspondem à assinatura PDF
    for (let i = 0; i < pdfSignature.length; i++) {
      if (bytes[i] !== pdfSignature[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar integridade do PDF:', error);
    return false;
  }
}

// Função para estimar número de páginas (aproximação baseada no tamanho)
export function estimatePDFPages(fileSize: number): number {
  // Estimativa baseada em média de 50KB por página para PDFs de prestação de contas
  const avgPageSize = 50 * 1024; // 50KB
  return Math.max(1, Math.round(fileSize / avgPageSize));
}

// Função principal de validação
export async function validateFile(file: File): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const metadata = extractFileMetadata(file);

  // Validação de nome do arquivo
  if (!file.name || file.name.trim().length === 0) {
    errors.push('Nome do arquivo é obrigatório');
  }

  if (file.name.length > FILE_VALIDATION_CONFIG.maxFileNameLength) {
    errors.push(`Nome do arquivo muito longo (máximo: ${FILE_VALIDATION_CONFIG.maxFileNameLength} caracteres)`);
  }

  // Validação de caracteres especiais no nome
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(file.name)) {
    errors.push('Nome do arquivo contém caracteres inválidos');
  }

  // Validação de tamanho
  if (file.size < FILE_VALIDATION_CONFIG.minSizeBytes) {
    errors.push(`Arquivo muito pequeno (mínimo: ${formatFileSize(FILE_VALIDATION_CONFIG.minSizeBytes)})`);
  }

  if (file.size > FILE_VALIDATION_CONFIG.maxSizeBytes) {
    errors.push(`Arquivo muito grande (máximo: ${formatFileSize(FILE_VALIDATION_CONFIG.maxSizeBytes)})`);
  }

  // Informação sobre armazenamento no Google Drive
  if (file.size > 50 * 1024 * 1024) { // 50MB
    warnings.push(`Arquivo grande (${formatFileSize(file.size)}) será armazenado no Google Drive`);
  }

  // Validação de tipo MIME
  if (!FILE_VALIDATION_CONFIG.allowedMimeTypes.includes(file.type)) {
    errors.push(`Tipo de arquivo não permitido. Tipos aceitos: ${FILE_VALIDATION_CONFIG.allowedMimeTypes.join(', ')}`);
  }

  // Validação de extensão
  if (!FILE_VALIDATION_CONFIG.allowedExtensions.includes(metadata.extension)) {
    errors.push(`Extensão de arquivo não permitida. Extensões aceitas: ${FILE_VALIDATION_CONFIG.allowedExtensions.join(', ')}`);
  }

  // Verificação de integridade do PDF
  if (metadata.isPDF) {
    const isValidPDF = await verifyPDFIntegrity(file);
    if (!isValidPDF) {
      errors.push('Arquivo PDF corrompido ou inválido');
    } else {
      // Estimar número de páginas
      metadata.estimatedPages = estimatePDFPages(file.size);
      
      // Warnings baseados no tamanho
      if (file.size > 50 * 1024 * 1024) { // 50MB
        warnings.push('Arquivo grande pode demorar mais para processar');
      }
      
      if (metadata.estimatedPages > 100) {
        warnings.push(`Arquivo com muitas páginas estimadas (${metadata.estimatedPages})`);
      }
    }
  }

  // Calcular hash se não houver erros críticos
  if (errors.length === 0) {
    try {
      metadata.hash = await calculateFileHash(file);
    } catch (error) {
      warnings.push('Não foi possível calcular hash do arquivo');
    }
  }

  // Validações adicionais baseadas na data de modificação
  const now = Date.now();
  const fileAge = now - file.lastModified;
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  
  if (fileAge > oneYearMs) {
    warnings.push('Arquivo muito antigo (mais de 1 ano)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

// Função para validar múltiplos arquivos
export async function validateFiles(files: File[]): Promise<FileValidationResult[]> {
  const results = await Promise.all(files.map(validateFile));
  
  // Verificar duplicatas por hash
  const hashes = new Set<string>();
  results.forEach((result, index) => {
    if (result.metadata.hash && hashes.has(result.metadata.hash)) {
      result.errors.push('Arquivo duplicado detectado');
    } else if (result.metadata.hash) {
      hashes.add(result.metadata.hash);
    }
  });
  
  return results;
}

// Função utilitária para verificar se um arquivo é válido
export async function isValidFile(file: File): Promise<boolean> {
  const result = await validateFile(file);
  return result.isValid;
}

// Função para obter resumo de validação
export function getValidationSummary(results: FileValidationResult[]): {
  valid: number;
  invalid: number;
  warnings: number;
  totalSize: number;
} {
  return results.reduce(
    (acc, result) => ({
      valid: acc.valid + (result.isValid ? 1 : 0),
      invalid: acc.invalid + (result.isValid ? 0 : 1),
      warnings: acc.warnings + result.warnings.length,
      totalSize: acc.totalSize + result.metadata.size,
    }),
    { valid: 0, invalid: 0, warnings: 0, totalSize: 0 }
  );
}
