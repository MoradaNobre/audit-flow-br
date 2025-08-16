# Sistema de Fallback Google Drive

## 📋 Visão Geral

O sistema implementa um fallback inteligente para lidar com problemas de OAuth do Google Drive em desenvolvimento, garantindo que o upload sempre funcione.

## 🔄 Fluxo de Fallback

### 1. Tentativa Principal (OAuth)
- Usa `GoogleDriveOnlyStorage` com autenticação OAuth 2.0
- Upload real para pasta pública do Google Drive
- Progress tracking em tempo real

### 2. Fallback (Modo Simples)
- Ativado automaticamente em caso de falha do OAuth
- Usa `GoogleDriveSimple` para simulação em desenvolvimento
- Upload simulado com delay realístico

## 🛠️ Implementação

### Detecção de Modo
```typescript
GoogleDriveSimple.isDevelopmentMode()
// Retorna true se:
// - import.meta.env.DEV === true
// - window.location.hostname === 'localhost'
```

### Estrutura do Fallback
```typescript
try {
  // Tentativa com OAuth
  uploadResult = await googleDrive.uploadFile(file, condominioId, onProgress);
} catch (oauthError) {
  if (GoogleDriveSimple.isDevelopmentMode()) {
    // Fallback para modo simples
    uploadResult = await googleDriveSimple.uploadFile(file, fileName);
  } else {
    throw oauthError; // Re-throw em produção
  }
}
```

## 🔧 Configuração

### Variáveis de Ambiente Necessárias
```env
# Para OAuth (produção)
VITE_GOOGLE_DRIVE_CLIENT_ID=seu_client_id_aqui

# Para API Key (desenvolvimento)
VITE_GOOGLE_DRIVE_API_KEY=sua_api_key_aqui
```

### Modo OAuth (Produção)
- Requer Client ID configurado
- Requer domínio autorizado no Google Cloud Console
- Upload real para Google Drive

### Modo Simples (Desenvolvimento)
- Requer apenas API Key
- Simula upload com delay
- Gera IDs e URLs simulados

## 📊 Logs e Debugging

### Logs do Sistema
```
🔄 Tentando upload com Google Drive OAuth...
⚠️ Falha no OAuth, tentando modo simples...
🔄 Usando modo de desenvolvimento...
✅ Upload simulado concluído
```

### Identificação de Modo
- **OAuth**: `✅ Upload com OAuth bem-sucedido`
- **Simples**: `⚠️ MODO DESENVOLVIMENTO: Upload simulado`

## 🚨 Problemas Comuns

### 1. Erro de CORS
```
Refused to load the script 'https://www.gstatic.com/_/...'
```
**Solução**: Configurar domínio no Google Cloud Console

### 2. OAuth Iframe Error
```
An iframe which has both allow-scripts and allow-same-origin...
```
**Solução**: Automática - sistema usa fallback

### 3. API Key Inválida
```
Erro na API Key: 400 - Invalid API key
```
**Solução**: Verificar VITE_GOOGLE_DRIVE_API_KEY no .env

## 🎯 Vantagens do Sistema

### ✅ Desenvolvimento
- Funciona sem configuração complexa de OAuth
- Não requer domínio HTTPS
- Simula comportamento real

### ✅ Produção
- OAuth completo e seguro
- Upload real para Google Drive
- Fallback graceful se necessário

### ✅ Debugging
- Logs detalhados em cada etapa
- Identificação clara do modo ativo
- Tratamento de erros específicos

## 🔄 Próximos Passos

1. **Configurar OAuth para produção**
   - Adicionar domínio de produção no Google Cloud Console
   - Configurar VITE_GOOGLE_DRIVE_CLIENT_ID

2. **Testar em ambiente de produção**
   - Verificar se OAuth funciona corretamente
   - Confirmar uploads reais

3. **Monitorar logs**
   - Acompanhar qual modo está sendo usado
   - Identificar problemas de configuração

## 📚 Arquivos Relacionados

- `src/lib/googleDriveOnly.ts` - Sistema OAuth principal
- `src/lib/googleDriveSimple.ts` - Sistema de fallback
- `src/components/UploadModal.tsx` - Implementação do fallback
- `GOOGLE_DRIVE_SETUP.md` - Guia de configuração OAuth
