# 🗄️ Configuração do Storage - Bucket para PDFs

## ❌ Problema Identificado

O erro `Bucket not found` indica que o bucket `prestacoes-pdf` não existe no seu projeto Supabase.

## ✅ Soluções Disponíveis

### Opção 1: Criar Bucket via Dashboard Supabase (Recomendado)

1. **Acesse o Dashboard do Supabase**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione o projeto `nuezynjflbdbxgqnpejw`

2. **Navegue até Storage**
   - No menu lateral, clique em "Storage"
   - Clique em "Create a new bucket"

3. **Configure o Bucket**
   ```
   Bucket name: prestacoes-pdf
   Public bucket: ✅ Sim (marcado)
   File size limit: 50 MB
   Allowed MIME types: application/pdf
   ```

4. **Criar Políticas RLS**
   - Vá para "Policies" na seção Storage
   - Clique em "New Policy" para o bucket `prestacoes-pdf`
   - Adicione as seguintes políticas:

   **Política de Upload:**
   ```sql
   CREATE POLICY "Usuários autenticados podem fazer upload de PDFs" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'prestacoes-pdf' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = 'prestacoes'
   );
   ```

   **Política de Leitura:**
   ```sql
   CREATE POLICY "PDFs são públicos para leitura" ON storage.objects
   FOR SELECT USING (
     bucket_id = 'prestacoes-pdf'
   );
   ```

### Opção 2: Usar Script Automatizado

1. **Configure as variáveis de ambiente**
   - Obtenha sua `Service Role Key` no dashboard do Supabase
   - Edite o arquivo `scripts/create-storage-bucket.js`
   - Substitua `SUA_SERVICE_ROLE_KEY_AQUI` pela sua chave

2. **Execute o script**
   ```bash
   cd scripts
   node create-storage-bucket.js
   ```

### Opção 3: SQL Direto (Avançado)

Execute o SQL do arquivo `supabase/migrations/20250816135500_create_storage_bucket.sql` diretamente no SQL Editor do dashboard Supabase.

## 🧪 Testando a Configuração

Após criar o bucket, teste o upload:

1. **Recarregue a aplicação** (F5)
2. **Selecione um condomínio**
3. **Faça upload de um PDF**
4. **Verifique se o processo completa sem erros**

## 📁 Estrutura de Arquivos

Os arquivos serão organizados da seguinte forma:
```
prestacoes-pdf/
├── prestacoes/
│   ├── {condominio_id}/
│   │   ├── {timestamp}-{nome_arquivo}.pdf
│   │   └── ...
│   └── ...
```

## 🔍 Verificação

Para verificar se o bucket foi criado corretamente:

1. **Dashboard > Storage**
2. **Verifique se `prestacoes-pdf` aparece na lista**
3. **Clique no bucket e verifique as configurações**
4. **Teste um upload via aplicação**

## 🆘 Suporte

Se ainda houver problemas:

1. **Verifique as credenciais** do Supabase no código
2. **Confirme as permissões** da Service Role Key
3. **Verifique os logs** no dashboard do Supabase
4. **Teste com um arquivo PDF pequeno** primeiro

---

**⚠️ Importante:** Após configurar o bucket, a aplicação deve funcionar normalmente para upload de PDFs!
