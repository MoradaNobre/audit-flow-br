# Edge Function: Extract PDF Data

## 📋 Visão Geral

Esta Edge Function foi **completamente melhorada** para implementar extração robusta de dados de PDFs de prestação de contas de condomínios, seguindo as melhores práticas de desenvolvimento.

## 🚀 Melhorias Implementadas

### ✅ **1. Sistema de Retry com Backoff Exponencial**
- Retry automático em caso de falha (máximo 3 tentativas)
- Backoff exponencial com jitter para evitar thundering herd
- Logs detalhados de cada tentativa

### ✅ **2. Timeout Configurável**
- Timeout de 2 minutos para operações de IA
- Timeout de 60 segundos para download de PDF
- Timeout de 30 segundos para verificação de tamanho
- Timeout de 10 segundos para parse do request body

### ✅ **3. Validação Robusta de Dados**
- Validação matemática de consistência (receitas, despesas, saldos)
- Verificação de tipos de dados
- Tolerância de 1% para diferenças de arredondamento
- Score de confiança baseado na qualidade dos dados

### ✅ **4. Logs Estruturados**
- Logs em formato JSON com timestamp
- Níveis: DEBUG, INFO, WARN, ERROR
- Context tracking com request ID único
- Métricas de performance detalhadas

### ✅ **5. Tratamento de Erros Aprimorado**
- Enum de tipos de erro específicos
- Status HTTP apropriados para cada tipo de erro
- Fallback graceful para dados de exemplo
- Stack traces em logs de erro

### ✅ **6. Validação de Entrada**
- Validação de método HTTP (apenas POST)
- Validação de Content-Type
- Validação de formato de URL
- Sanitização de dados de entrada

### ✅ **7. Metadata Rica**
- Método de extração utilizado (LLM, fallback, sample)
- Tempo de processamento em millisegundos
- Tamanho do arquivo em bytes
- Score de confiança (0-1)
- Lista de warnings encontrados

## 📊 Tipos de Erro Suportados

| Tipo | Status HTTP | Descrição |
|------|-------------|-----------|
| `VALIDATION_ERROR` | 400 | Dados de entrada inválidos |
| `FILE_TOO_LARGE` | 413 | Arquivo excede 100MB |
| `TIMEOUT_ERROR` | 408 | Operação excedeu timeout |
| `API_ERROR` | 502 | Erro na API externa (OpenAI/Gemini) |
| `NETWORK_ERROR` | 503 | Erro de conectividade |
| `PARSING_ERROR` | 500 | Erro no parsing de dados |

## 🔧 Configurações

### Limites de Arquivo
```typescript
const FILE_LIMITS = {
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  largeSizeThreshold: 50 * 1024 * 1024, // 50MB
};
```

### Configurações de Retry
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  timeoutMs: 120000, // 2 minutos
};
```

## 📝 Formato de Resposta

### Sucesso
```json
{
  "success": true,
  "data": {
    "total_receitas": 47500.00,
    "total_despesas": 43200.50,
    "saldo_anterior": 2800.30,
    "saldo_final": 7099.80,
    "despesas_por_categoria": [...],
    "receitas_por_categoria": [...],
    "inconsistencias": [...],
    "metadata": {
      "extraction_method": "llm",
      "processing_time_ms": 15420,
      "file_size_bytes": 2048576,
      "confidence_score": 0.95,
      "warnings": []
    }
  },
  "metadata": {
    "requestId": "uuid-v4",
    "processingTime": 15420,
    "timestamp": "2025-08-16T13:15:11.000Z"
  }
}
```

### Erro
```json
{
  "success": false,
  "error": "Erro de validação",
  "details": "URL do documento é obrigatória",
  "errorType": "VALIDATION_ERROR",
  "metadata": {
    "requestId": "uuid-v4",
    "processingTime": 125,
    "timestamp": "2025-08-16T13:15:11.000Z"
  }
}
```

## 🧪 Validações Implementadas

### Validações de Entrada
- ✅ Método HTTP deve ser POST
- ✅ Content-Type deve ser application/json
- ✅ documentUrl é obrigatório e deve ser string válida
- ✅ URL deve ter formato válido

### Validações de Dados Extraídos
- ✅ Todos os valores numéricos devem ser positivos
- ✅ Arrays de categorias devem ter estrutura correta
- ✅ Soma das categorias deve conferir com totais
- ✅ Equação fundamental: saldo_final = saldo_anterior + receitas - despesas

### Validações de Arquivo
- ✅ Tamanho máximo de 100MB
- ✅ Verificação de integridade do download
- ✅ Fallback para arquivos grandes (>50MB)

## 🔄 Fluxo de Processamento

1. **Validação de Entrada** → Valida método, headers e body
2. **Download do PDF** → Com retry e timeout
3. **Verificação de Tamanho** → Aplica limites configurados
4. **Extração via IA** → OpenAI ou Gemini com retry
5. **Validação de Dados** → Verifica consistência matemática
6. **Geração de Metadata** → Adiciona métricas e confiança
7. **Resposta Estruturada** → JSON com dados e metadata

## 📈 Métricas de Performance

A função agora coleta métricas detalhadas:
- Tempo total de processamento
- Tempo de download do PDF
- Tempo de extração via IA
- Número de tentativas de retry
- Score de confiança dos dados
- Tamanho do arquivo processado

## 🛡️ Segurança

- Rate limiting implícito via timeout
- Validação rigorosa de entrada
- Sanitização de URLs
- Logs estruturados para auditoria
- Fallback seguro em caso de erro

## 🔮 Próximos Passos

1. **Implementar cache** para PDFs já processados
2. **Adicionar webhook** para notificações assíncronas
3. **Implementar queue system** para processamento em lote
4. **Adicionar métricas** para monitoramento
5. **Implementar rate limiting** por usuário

---

Esta implementação representa uma **melhoria significativa** na robustez, confiabilidade e observabilidade da extração de dados, seguindo as melhores práticas de desenvolvimento de Edge Functions.
