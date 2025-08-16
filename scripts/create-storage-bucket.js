/**
 * Script para criar o bucket de storage necessário para o upload de PDFs
 * Execute este script uma vez para configurar o bucket no Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas credenciais do Supabase
const SUPABASE_URL = 'https://nuezynjflbdbxgqnpejw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Use a service role key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createStorageBucket() {
  try {
    console.log('🚀 Criando bucket de storage...');

    // Criar o bucket
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('prestacoes-pdf', {
      public: true,
      fileSizeLimit: 104857600, // 100MB
      allowedMimeTypes: ['application/pdf']
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket já existe, continuando...');
      } else {
        console.error('❌ Erro ao criar bucket:', bucketError);
        return;
      }
    } else {
      console.log('✅ Bucket criado com sucesso:', bucketData);
    }

    // Criar as políticas RLS
    console.log('🔐 Criando políticas de segurança...');

    const policies = [
      {
        name: 'upload_policy',
        sql: `
          CREATE POLICY "Usuários autenticados podem fazer upload de PDFs" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'prestacoes-pdf' 
            AND auth.role() = 'authenticated'
            AND (storage.foldername(name))[1] = 'prestacoes'
          );
        `
      },
      {
        name: 'select_policy',
        sql: `
          CREATE POLICY "PDFs são públicos para leitura" ON storage.objects
          FOR SELECT USING (
            bucket_id = 'prestacoes-pdf'
          );
        `
      },
      {
        name: 'update_policy',
        sql: `
          CREATE POLICY "Usuários podem atualizar seus próprios arquivos" ON storage.objects
          FOR UPDATE USING (
            bucket_id = 'prestacoes-pdf' 
            AND auth.uid()::text = (storage.foldername(name))[2]
          );
        `
      },
      {
        name: 'delete_policy',
        sql: `
          CREATE POLICY "Usuários podem deletar seus próprios arquivos" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'prestacoes-pdf' 
            AND auth.uid()::text = (storage.foldername(name))[2]
          );
        `
      }
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql: policy.sql
      });

      if (policyError) {
        console.warn(`⚠️ Aviso ao criar política ${policy.name}:`, policyError.message);
      } else {
        console.log(`✅ Política ${policy.name} criada com sucesso`);
      }
    }

    console.log('🎉 Configuração do storage concluída!');
    console.log('📁 Bucket criado: prestacoes-pdf');
    console.log('🔒 Políticas de segurança aplicadas');
    console.log('📝 Agora você pode fazer upload de PDFs através da aplicação');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
  }
}

// Executar o script
createStorageBucket();
