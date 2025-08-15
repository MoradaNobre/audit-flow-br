import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to robustly extract a JSON object from LLM text
function extractJsonObject(text: string): any {
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Look for fenced code blocks ```json ... ``` or ``` ... ```
  const fenced = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    const candidate = fenced[1].trim();
    try { return JSON.parse(candidate); } catch (_) {}
  }

  // Heuristic: take substring between first { and last }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = text.substring(first, last + 1);
    try { return JSON.parse(candidate); } catch (_) {}
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prestacaoId } = await req.json();
    
    if (!prestacaoId) {
      throw new Error('ID da prestação de contas é obrigatório');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get prestacao data
    const { data: prestacao, error: prestacaoError } = await supabase
      .from('prestacoes_contas')
      .select(`
        *,
        condominios(nome, cnpj, endereco)
      `)
      .eq('id', prestacaoId)
      .single();

    if (prestacaoError) {
      throw new Error(`Erro ao buscar prestação: ${prestacaoError.message}`);
    }

    // Update status to processing
    await supabase
      .from('prestacoes_contas')
      .update({ status_analise: 'processando' })
      .eq('id', prestacaoId);

    console.log('Iniciando análise para prestação:', prestacaoId);

    // Prepare data for AI analysis
    const analysisData = {
      condominio: prestacao.condominios?.nome || 'N/A',
      cnpj: prestacao.condominios?.cnpj || 'N/A',
      mes_referencia: prestacao.mes_referencia,
      ano_referencia: prestacao.ano_referencia,
      arquivo_url: prestacao.arquivo_url
    };

    // Load admin LLM settings (default to Gemini Flash)
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const provider = (settings?.llm_provider as 'gemini' | 'openai') ?? 'gemini';
    const model = settings?.llm_model ?? (provider === 'gemini' ? 'gemini-2.0-flash-exp' : 'gpt-4o-mini');

    const analysisPrompt = `
Analise os dados financeiros do condomínio abaixo e identifique possíveis inconsistências ou irregularidades:

Condomínio: ${analysisData.condominio}
CNPJ: ${analysisData.cnpj}
Período: ${analysisData.mes_referencia}/${analysisData.ano_referencia}

Por favor, analise e forneça:
1. Resumo geral da situação financeira
2. Inconsistências encontradas (se houver)
3. Recomendações para melhorias
4. Nível de criticidade (baixo, médio, alto) para cada inconsistência

Formato de resposta em JSON:
{
  "resumo": "string",
  "situacao_geral": "string",
  "inconsistencias": [
    {
      "tipo": "string",
      "descricao": "string",
      "nivel_criticidade": "baixo|médio|alto"
    }
  ],
  "recomendacoes": ["string"],
  "conclusao": "string"
}
`;

    let analysisResult: any;

    if (provider === 'gemini') {
      const geminiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiKey) throw new Error('Gemini API key não configurada');

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{
                text: 'Você é um auditor especializado em prestações de contas de condomínios. Sempre responda em JSON válido e em português.\n' + analysisPrompt
              }]
            }
          ]
        })
      });

      if (!geminiRes.ok) throw new Error(`Erro na API Gemini: ${geminiRes.status}`);
      const geminiJson = await geminiRes.json();
      const text = (geminiJson.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p.text)
        .join('');
      const parsed = extractJsonObject(text);
      if (!parsed) throw new Error('Resposta da LLM (Gemini) não pôde ser interpretada como JSON');
      analysisResult = parsed;
    } else {
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) throw new Error('OpenAI API key não configurada');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Você é um auditor especializado em análise de prestações de contas de condomínios. Sempre responda em JSON válido e em português.' },
            { role: 'user', content: analysisPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.3
        }),
      });
      if (!response.ok) throw new Error(`Erro na API OpenAI: ${response.status}`);
      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content ?? '';
      const parsed = extractJsonObject(content);
      if (!parsed) throw new Error('Resposta da LLM (OpenAI) não pôde ser interpretada como JSON');
      analysisResult = parsed;
    }

    console.log('Análise concluída:', analysisResult);

    // Create audit report
    const { data: relatorio, error: relatorioError } = await supabase
      .from('relatorios_auditoria')
      .insert({
        prestacao_id: prestacaoId,
        resumo: analysisResult.resumo,
        conteudo_gerado: analysisResult
      })
      .select()
      .single();

    if (relatorioError) {
      throw new Error(`Erro ao criar relatório: ${relatorioError.message}`);
    }

    // Insert inconsistencies if any
    if (analysisResult.inconsistencias && analysisResult.inconsistencias.length > 0) {
      const inconsistencias = analysisResult.inconsistencias.map((inc: any) => ({
        relatorio_id: relatorio.id,
        tipo: inc.tipo,
        descricao: inc.descricao,
        nivel_criticidade: inc.nivel_criticidade
      }));

      const { error: inconsistenciasError } = await supabase
        .from('inconsistencias')
        .insert(inconsistencias);

      if (inconsistenciasError) {
        console.error('Erro ao inserir inconsistências:', inconsistenciasError);
      }
    }

    // Update status to completed
    await supabase
      .from('prestacoes_contas')
      .update({ status_analise: 'concluido' })
      .eq('id', prestacaoId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        relatorioId: relatorio.id,
        message: 'Análise concluída com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro na análise:', error);

    // Update status to error if we have prestacaoId
    try {
      const bodyText = await req.text();
      const body = JSON.parse(bodyText);
      const prestacaoId = body.prestacaoId;
      
      if (prestacaoId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('prestacoes_contas')
          .update({ status_analise: 'erro' })
          .eq('id', prestacaoId);
      }
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    }

    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});