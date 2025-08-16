# 🔧 Configuração do Google Drive API

## 📋 Pré-requisitos

Para usar arquivos grandes (>50MB), você precisa configurar a integração com Google Drive API.

## 🚀 Passo a Passo

### 1. Criar Projeto no Google Cloud Console

1. **Acesse**: https://console.cloud.google.com/
2. **Crie um novo projeto** ou selecione um existente
3. **Nome sugerido**: `Audit Flow BR - Storage`

### 2. Ativar Google Drive API

1. **Vá para**: APIs & Services → Library
2. **Busque**: "Google Drive API"
3. **Clique em**: "Enable"

### 3. Criar Credenciais

#### API Key
1. **Vá para**: APIs & Services → Credentials
2. **Clique**: "Create Credentials" → "API Key"
3. **Copie** a API Key gerada
4. **Restrinja** (recomendado):
   - HTTP referrers: `http://localhost:5173/*`, `https://seudominio.com/*`
   - APIs: Google Drive API

#### OAuth 2.0 Client ID
1. **Configure OAuth consent screen** primeiro:
   - User Type: External (para teste) ou Internal (para organização)
   - App name: `Audit Flow BR`
   - User support email: seu email
   - Scopes: `../auth/drive.file`

2. **Crie OAuth Client ID**:
   - Application type: Web application
   - Name: `Audit Flow BR Web Client`
   - Authorized JavaScript origins: 
     - `http://localhost:5173`
     - `https://seudominio.com` (produção)
   - Authorized redirect URIs:
     - `http://localhost:5173`
     - `https://seudominio.com` (produção)

### 4. Configurar Variáveis de Ambiente

1. **Copie** o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. **Edite** o arquivo `.env`:
   ```env
   # Configurações do Google Drive
   VITE_GOOGLE_DRIVE_API_KEY=sua_api_key_aqui
   VITE_GOOGLE_DRIVE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
   ```

### 5. Testar a Configuração

1. **Reinicie** o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. **Teste** com um arquivo >50MB:
   - A aplicação deve detectar automaticamente
   - Solicitar autenticação Google
   - Fazer upload para Google Drive

## 🔒 Segurança

### Configurações Recomendadas

1. **Restrinja a API Key**:
   - Apenas HTTP referrers autorizados
   - Apenas Google Drive API

2. **Configure OAuth corretamente**:
   - Domínios autorizados
   - Scopes mínimos necessários

3. **Monitore o uso**:
   - Google Cloud Console → APIs & Services → Quotas

## 📊 Limites e Quotas

### Google Drive API
- **Queries por dia**: 1,000,000,000
- **Queries por 100s por usuário**: 1,000
- **Upload por arquivo**: 5TB (mais que suficiente)

### Supabase Storage
- **Arquivo individual**: 50MB (configurado)
- **Total do projeto**: Depende do plano

## 🧪 Teste Local

### Arquivo Pequeno (≤50MB)
```
✅ Supabase Storage
📁 Bucket: prestacoes-pdf
🔗 URL: https://nuezynjflbdbxgqnpejw.supabase.co/storage/v1/object/public/...
```

### Arquivo Grande (>50MB)
```
✅ Google Drive
📁 Pasta: Audit Flow BR
🔗 URL: https://drive.google.com/file/d/...
🔐 Requer: Autenticação Google
```

## 🔧 Troubleshooting

### Erro: "API Key not valid"
- ✅ Verifique se a API Key está correta no `.env`
- ✅ Confirme se Google Drive API está ativada
- ✅ Verifique restrições da API Key

### Erro: "OAuth client not found"
- ✅ Verifique se o Client ID está correto
- ✅ Confirme domínios autorizados
- ✅ Verifique se OAuth consent screen está configurado

### Erro: "Access denied"
- ✅ Usuário precisa autorizar a aplicação
- ✅ Verifique scopes solicitados
- ✅ Confirme se usuário tem permissão

### Upload não funciona
- ✅ Verifique console do browser (F12)
- ✅ Confirme se arquivo é >50MB
- ✅ Teste com arquivo menor primeiro

## 📝 Logs Úteis

Para debug, abra o console do browser (F12) e procure por:
```
✅ Google Drive API inicializada
🔐 Autenticação Google realizada
📤 Upload iniciado para Google Drive
✅ Arquivo enviado para Google Drive
```

## 🎯 Próximos Passos

Após configurar:
1. **Teste** com arquivos pequenos e grandes
2. **Configure** produção com domínio real
3. **Monitore** uso das APIs
4. **Implemente** backup/sincronização (futuro)

---

**💡 Dica**: Mantenha as credenciais seguras e nunca as commite no repositório!
