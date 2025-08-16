# Configuração do Ambiente de Desenvolvimento

## ⚠️ Configuração Obrigatória

Para executar o aplicativo localmente, você precisa configurar as variáveis de ambiente. Siga os passos abaixo:

## 1. Configurar Variáveis de Ambiente

O arquivo `.env` foi criado automaticamente. Você precisa preencher as seguintes variáveis:

### Supabase (Obrigatório)
```env
VITE_SUPABASE_URL=https://nuezynjflbdbxgqnpejw.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase_aqui
```

### Google Drive (Obrigatório para Upload)
```env
VITE_GOOGLE_DRIVE_API_KEY=sua_api_key_do_google_drive_aqui
VITE_GOOGLE_DRIVE_CLIENT_ID=seu_client_id_do_google_drive_aqui
```

## 2. Como Obter as Chaves

### Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Faça login no seu projeto
3. Vá em Settings > API
4. Copie a `anon public` key

### Google Drive API
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Ative a Google Drive API
4. Crie credenciais (API Key e OAuth 2.0 Client ID)
5. Configure o OAuth consent screen
6. Adicione `http://localhost:5173` como origem autorizada

## 3. Arquivo .env Exemplo

```env
# Configurações do Supabase
VITE_SUPABASE_URL=https://nuezynjflbdbxgqnpejw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Configurações do Google Drive
VITE_GOOGLE_DRIVE_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvw
VITE_GOOGLE_DRIVE_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com

# Configurações opcionais
VITE_APP_NAME=Audit Flow BR
VITE_APP_VERSION=1.0.0
```

## 4. Executar o Aplicativo

Após configurar as variáveis:

```bash
npm run dev
```

## 🔒 Segurança

- **NUNCA** commite o arquivo `.env` no Git
- O arquivo `.env` está no `.gitignore`
- Use apenas as chaves necessárias para desenvolvimento
- Para produção, configure as variáveis no seu provedor de hospedagem

## 📚 Documentação Adicional

- [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md) - Guia detalhado do Google Drive
- [STORAGE_SETUP.md](./STORAGE_SETUP.md) - Configuração de storage (opcional)
