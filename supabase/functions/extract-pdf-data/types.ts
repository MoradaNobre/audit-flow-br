// Tipos para o ambiente Deno
declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
    const env: Env;
  }
}

// Tipos para as APIs externas
export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Tipos para validação
export interface ValidationRule {
  field: string;
  required: boolean;
  type: 'number' | 'string' | 'array';
  min?: number;
  max?: number;
}

// Tipos para métricas
export interface ProcessingMetrics {
  startTime: number;
  endTime: number;
  fileSize: number;
  retryAttempts: number;
  apiProvider: 'openai' | 'gemini';
  success: boolean;
}
