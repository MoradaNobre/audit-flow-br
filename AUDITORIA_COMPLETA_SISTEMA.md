# AUDITORIA COMPLETA - Sistema de Auditoria para Condomínios

## PROMPT PARA RECRIAR A APLICAÇÃO COMPLETA

Você deve recriar uma aplicação React completa de Sistema de Auditoria para Condomínios com as seguintes especificações:

## STACK TECNOLÓGICA

### Frontend
- **React 18** com TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilização com design system customizado
- **Shadcn/ui** para componentes de interface
- **React Router DOM** para roteamento
- **Tanstack Query** para gerenciamento de estado servidor
- **React Hook Form** com Zod para validação
- **Recharts** para gráficos e dashboards
- **Sonner** para notificações toast
- **html2canvas** e **jsPDF** para exportação de relatórios

### Backend/Database
- **Supabase** como BaaS (Backend as a Service)
- **PostgreSQL** como banco de dados
- **Row Level Security (RLS)** para controle de acesso
- **Supabase Edge Functions** para processamento serverless
- **Supabase Storage** para arquivos
- **Google Drive API** integração para backup/storage alternativo

### Integrações AI
- **OpenAI API** (GPT-4o-mini) para análise de documentos
- **Google Gemini API** como alternativa
- **PDF parsing** e **financial validation** automática

## ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais

#### 1. condominios
```sql
CREATE TABLE condominios (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  nome text NOT NULL,
  cnpj text,
  endereco text,
  sindico_nome varchar,
  sindico_email varchar,
  numero_lotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

#### 2. prestacoes_contas
```sql
CREATE TABLE prestacoes_contas (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  condominio_id uuid NOT NULL REFERENCES condominios(id),
  mes_referencia integer NOT NULL,
  ano_referencia integer NOT NULL,
  arquivo_url text,
  arquivo_tamanho bigint,
  drive_file_id varchar,
  drive_public_url text,
  drive_download_url text,
  extracted_data jsonb,
  status_analise analysis_status DEFAULT 'pendente',
  analysis_status analysis_status_enum DEFAULT 'pending',
  analysis_score integer,
  upload_verified boolean DEFAULT false,
  real_data_extracted boolean DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);
```

#### 3. relatorios_auditoria
```sql
CREATE TABLE relatorios_auditoria (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  prestacao_id uuid NOT NULL REFERENCES prestacoes_contas(id),
  conteudo_gerado jsonb,
  resumo text,
  data_geracao timestamptz DEFAULT now()
);
```

#### 4. inconsistencias
```sql
CREATE TABLE inconsistencias (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  relatorio_id uuid NOT NULL REFERENCES relatorios_auditoria(id),
  tipo inconsistencia_tipo NOT NULL,
  nivel_criticidade criticidade_enum NOT NULL,
  descricao text NOT NULL
);
```

#### 5. financial_analysis
```sql
CREATE TABLE financial_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestacao_id uuid NOT NULL UNIQUE REFERENCES prestacoes_contas(id),
  validation_result jsonb NOT NULL,
  analyzed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 6. profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome_completo text,
  created_at timestamptz DEFAULT now()
);
```

#### 7. user_roles
```sql
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'condomino',
  created_at timestamptz DEFAULT now()
);
```

#### 8. associacoes_usuarios_condominios
```sql
CREATE TABLE associacoes_usuarios_condominios (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  condominio_id uuid NOT NULL,
  papel user_condominio_papel NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### ENUMs Necessários
```sql
CREATE TYPE analysis_status AS ENUM ('pendente', 'processando', 'concluido', 'erro');
CREATE TYPE analysis_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE inconsistencia_tipo AS ENUM ('matematica', 'contabil', 'documental', 'regulatoria');
CREATE TYPE criticidade_enum AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE user_condominio_papel AS ENUM ('administrador', 'auditor', 'sindico', 'condomino');
```

### Funções do Banco
```sql
-- Função para verificar role do usuário
CREATE FUNCTION get_user_role(user_uuid uuid) RETURNS text;

-- Função para verificar acesso a condomínio  
CREATE FUNCTION user_has_condominio_access(user_uuid uuid, cond_id uuid) RETURNS boolean;

-- Função para buscar condomínios do usuário
CREATE FUNCTION get_user_condominios(user_uuid uuid) RETURNS SETOF uuid;

-- Função para análise financeira
CREATE FUNCTION get_financial_analysis(p_prestacao_id uuid) RETURNS TABLE(...);

-- Função para criar perfil automaticamente
CREATE FUNCTION handle_new_user() RETURNS trigger;
```

## ESTRUTURA DE PASTAS

```
src/
├── components/
│   ├── ui/ (shadcn components)
│   ├── AdminActions.tsx
│   ├── CreateCondominioModal.tsx
│   ├── EditCondominioModal.tsx
│   ├── FinancialCharts.tsx
│   ├── LLMSettingsDialog.tsx
│   ├── PDFPreview.tsx
│   ├── ProcessingQueue.tsx
│   ├── ProcessingStatus.tsx
│   ├── ProtectedRoute.tsx
│   ├── RelatorioTemplate.tsx
│   ├── StorageInfo.tsx
│   ├── ThemeToggle.tsx
│   ├── UploadModal.tsx
│   ├── ValidationModal.tsx
│   ├── ValidationResults.tsx
│   └── theme-provider.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── useAdminSettings.ts
│   ├── useCondominios.ts
│   ├── useDatabase.ts
│   ├── useFinancialValidation.ts
│   ├── useInconsistencias.ts
│   ├── usePermissions.ts
│   ├── usePrestacoes.ts
│   ├── useProcessingStatus.ts
│   ├── useRelatorios.ts
│   ├── useReportGeneration.ts
│   └── useRoles.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── lib/
│   ├── fileValidation.ts
│   ├── financialValidation.ts
│   ├── formatFileSize.ts
│   ├── googleDriveStorage.ts
│   ├── hybridStorage.ts
│   ├── pdfExport.ts
│   └── utils.ts
├── pages/
│   ├── Auth.tsx
│   ├── Condominio.tsx
│   ├── InconsistenciasTeste.tsx
│   ├── Index.tsx
│   ├── NotFound.tsx
│   ├── Relatorio.tsx
│   ├── TestValidation.tsx
│   └── Users.tsx
├── index.css (design system)
├── main.tsx
└── App.tsx
```

## FUNCIONALIDADES PRINCIPAIS

### 1. Sistema de Autenticação
- **Login/Registro** via Supabase Auth
- **Roles**: admin, auditor, sindico, condomino
- **Controle de acesso** baseado em RLS
- **Proteção de rotas** por permissão

### 2. Gestão de Condomínios
- **CRUD completo** de condomínios
- **Associação usuário-condomínio** com papéis
- **Dashboard** com estatísticas por condomínio

### 3. Upload e Processamento de PDFs
- **Upload para Supabase Storage** ou Google Drive
- **Validação de arquivo** (tipo, tamanho)
- **Extração automática** de dados via Edge Functions
- **Queue de processamento** assíncrono

### 4. Análise Financeira Automatizada
- **Validação matemática** de prestações
- **Detecção de inconsistências** automática
- **Score de conformidade** (0-100%)
- **Categorização** de erros por severidade

### 5. Geração de Relatórios
- **Relatórios de auditoria** automáticos
- **Exportação PDF** com html2canvas + jsPDF
- **Templates customizáveis** de relatório
- **Histórico** de relatórios gerados

### 6. Dashboard e Visualizações
- **Gráficos financeiros** com Recharts
- **KPIs** de performance
- **Timeline** de processamento
- **Status em tempo real**

### 7. Gestão de Usuários (Admin)
- **CRUD de usuários**
- **Atribuição de roles**
- **Configurações do sistema**
- **Logs de auditoria**

## EDGE FUNCTIONS

### 1. extract-pdf-data
```typescript
// Processa PDFs e extrai dados financeiros
// Usa OpenAI/Gemini para análise
// Salva dados extraídos em prestacoes_contas
```

### 2. analyze-accounts  
```typescript
// Executa validação financeira
// Gera inconsistências
// Calcula score de conformidade
```

### 3. process-queue
```typescript
// Processa fila de prestações
// Coordena extração + análise
// Atualiza status em tempo real
```

## CONFIGURAÇÕES ESPECÍFICAS

### Design System (index.css)
```css
:root {
  /* Cores principais em HSL */
  --primary: 220 90% 56%;
  --secondary: 220 14.3% 95.9%;
  --accent: 220 14.3% 95.9%;
  
  /* Estados */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --destructive: 0 84% 60%;
  
  /* Gradientes */
  --gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)));
}
```

### Validação Financeira
```typescript
// Implementar validações matemáticas:
// - Soma de receitas vs despesas
// - Validação de saldos
// - Detecção de anomalias
// - Verificação de conformidade contábil
```

### Integração Google Drive
```typescript
// Configurar backup automático
// Upload alternativo quando Supabase falha
// Sincronização bidirecional
```

## ROTAS DA APLICAÇÃO

```typescript
const routes = [
  { path: '/', component: Index },
  { path: '/auth', component: Auth },
  { path: '/condominio/:id', component: Condominio },
  { path: '/relatorio/:id', component: Relatorio },
  { path: '/relatorio/:id/teste-inconsistencias', component: InconsistenciasTeste },
  { path: '/users', component: Users },
  { path: '/test-validation', component: TestValidation },
  { path: '*', component: NotFound }
];
```

## POLÍTICAS RLS CRÍTICAS

```sql
-- Condominios: usuários só veem seus condomínios
CREATE POLICY "Users can view their associated condominios" 
ON condominios FOR SELECT 
USING (id IN (SELECT get_user_condominios(auth.uid())));

-- Prestações: baseado em acesso ao condomínio
CREATE POLICY "Users can view prestacoes of their condominios" 
ON prestacoes_contas FOR SELECT 
USING (user_has_condominio_access(auth.uid(), condominio_id));

-- Análises: seguem prestações
CREATE POLICY "Users can view financial analysis of their condominiums" 
ON financial_analysis FOR SELECT 
USING (EXISTS (SELECT 1 FROM prestacoes_contas p 
               JOIN associacoes_usuarios_condominios auc ON p.condominio_id = auc.condominio_id 
               WHERE p.id = financial_analysis.prestacao_id AND auc.user_id = auth.uid()));
```

## SECRETS NECESSÁRIOS

```
OPENAI_API_KEY
GEMINI_API_KEY  
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
```

## REQUISITOS ESPECÍFICOS

### Performance
- **Lazy loading** de components
- **Virtualization** para listas grandes
- **Debounce** em pesquisas
- **Cache** inteligente com TanStack Query

### UX/UI
- **Loading states** consistentes
- **Error boundaries** para falhas
- **Toast notifications** para feedback
- **Dark/Light mode** toggle
- **Responsive design** mobile-first

### Segurança
- **Validação client + server side**
- **File type restrictions** rigorosas
- **Rate limiting** em APIs
- **XSS protection** em uploads
- **CORS** configurado corretamente

### Acessibilidade
- **ARIA labels** em componentes
- **Keyboard navigation**
- **Screen reader** support
- **Color contrast** WCAG AA

## VALIDAÇÕES CRÍTICAS

### Upload de Arquivos
```typescript
const allowedTypes = ['application/pdf'];
const maxSize = 50 * 1024 * 1024; // 50MB
const validateFile = (file: File) => {
  // Validar tipo, tamanho, conteúdo
  // Verificar se é PDF válido
  // Scan por malware (se necessário)
};
```

### Dados Financeiros
```typescript
interface FinancialValidation {
  balanceCheck: boolean;
  mathematicalConsistency: boolean;
  requiredFields: string[];
  anomalies: Anomaly[];
  complianceScore: number;
}
```

## DEPLOYMENT

### Supabase
- **Database migrations** versionadas
- **Edge Functions** auto-deploy
- **Storage buckets** configurados
- **RLS policies** testadas

### Frontend
- **Build otimizado** com Vite
- **Environment variables** configuradas
- **Error tracking** configurado
- **Analytics** implementado

## TESTES RECOMENDADOS

### Unitários
- Hooks personalizados
- Funções de validação
- Utilitários

### Integração  
- Fluxos de upload
- Autenticação
- Operações CRUD

### E2E
- Jornada completa do usuário
- Upload → Processamento → Relatório
- Diferentes tipos de usuário

## MONITORAMENTO

### Métricas
- **Tempo de processamento** de PDFs
- **Taxa de sucesso** de uploads
- **Accuracy** da análise financeira
- **Performance** das queries

### Logs
- **Edge Functions** logs
- **Database** query performance
- **Error tracking** detalhado
- **User activity** tracking

---

**IMPORTANTE**: Esta aplicação já está funcional mas possui alguns bugs de tipagem e funcionalidades incompletas. O objetivo é recriar uma versão limpa, estável e totalmente funcional seguindo exatamente esta especificação.