# 🧪 COMO TESTAR O SISTEMA DE VALIDAÇÃO FINANCEIRA

## 📋 PASSO A PASSO PARA TESTE

### 1. **Aplicar SQL no Supabase**
1. Abra o Supabase Dashboard
2. Vá em **SQL Editor**
3. Copie e cole todo o conteúdo do arquivo `SQL_PARA_COPIAR_NO_SUPABASE.sql`
4. Execute o script clicando em **RUN**
5. Verifique se não há erros na execução

### 2. **Iniciar o Servidor de Desenvolvimento**
```bash
npm run dev
# ou
yarn dev
```

### 3. **Acessar a Página de Teste**
- Faça login no sistema
- Acesse: `http://localhost:5173/test-validation`
- Você verá a interface de teste com 6 cenários pré-definidos

## 🎯 CENÁRIOS DE TESTE DISPONÍVEIS

### ✅ **1. Cenário Perfeito**
- **Objetivo**: Validar que o sistema aprova dados corretos
- **Dados**: Todos os cálculos matemáticos corretos
- **Resultado Esperado**: Score 100%, status "Excellent"

### ❌ **2. Balanço Incorreto**
- **Objetivo**: Detectar inconsistência no cálculo do saldo
- **Problema**: Saldo final não bate com a fórmula
- **Resultado Esperado**: Erro crítico de "Inconsistência no Balanço"

### ⚠️ **3. Receita Negativa**
- **Objetivo**: Detectar valores negativos inválidos
- **Problema**: Receita com valor negativo
- **Resultado Esperado**: Erro de alta prioridade "Valor Negativo Inválido"

### 📊 **4. Percentual Incorreto**
- **Objetivo**: Validar soma de percentuais
- **Problema**: Categorias somam 110% em vez de 100%
- **Resultado Esperado**: Erro médio "Percentual Inválido"

### 🏢 **5. CNPJ Inválido**
- **Objetivo**: Validar algoritmo de CNPJ
- **Problema**: Dígitos verificadores incorretos
- **Resultado Esperado**: Erro médio "CNPJ Inválido"

### 📈 **6. Outlier Detectado**
- **Objetivo**: Detectar valores atípicos
- **Problema**: Uma categoria com valor muito diferente das outras
- **Resultado Esperado**: Aviso "Valor Atípico"

## 🔍 COMO INTERPRETAR OS RESULTADOS

### **Score e Status**
- **95-100%**: 🟢 Excellent (Excelente)
- **85-94%**: 🔵 Good (Bom)
- **70-84%**: 🟡 Fair (Regular)
- **0-69%**: 🔴 Poor (Ruim)

### **Severidade dos Erros**
- **Critical**: 🔴 Impedem aprovação (ex: balanço incorreto)
- **High**: 🟠 Requerem atenção (ex: valores negativos)
- **Medium**: 🟡 Devem ser revisados (ex: CNPJ inválido)
- **Low**: 🔵 Informativos (ex: pequenas variações)

### **Seções do Resultado**
1. **Score Visual**: Progress bar com percentual
2. **Estatísticas**: Grid com métricas (aprovados, reprovados, avisos)
3. **Erros Críticos**: Alertas vermelhos destacados
4. **Avisos**: Cards informativos em amarelo
5. **Recomendações**: Lista de ações sugeridas
6. **Resumo**: Análise textual completa

## 🛠️ TESTANDO DADOS CUSTOMIZADOS

### **Modificar Valores**
1. Selecione um cenário base
2. Altere os campos de entrada:
   - Receitas, Despesas, Saldos
   - CNPJ, Datas
3. Observe o "Cálculo Esperado" em tempo real
4. Clique em "Executar Validação"

### **Exemplos de Testes Manuais**

#### **Teste 1: Diferença Pequena no Saldo**
```
Receitas: 10000
Despesas: 8000  
Saldo Anterior: 2000
Saldo Final: 4000.01  // Diferença de R$ 0,01
```
**Resultado**: Deve ser aprovado (tolerância de R$ 0,01)

#### **Teste 2: Diferença Grande no Saldo**
```
Receitas: 10000
Despesas: 8000
Saldo Anterior: 2000  
Saldo Final: 4100     // Diferença de R$ 100
```
**Resultado**: Erro crítico de balanço

#### **Teste 3: CNPJ Válido**
```
CNPJ: 11.222.333/0001-81
```
**Resultado**: Deve ser aprovado

#### **Teste 4: CNPJ Inválido**
```
CNPJ: 11.222.333/0001-99
```
**Resultado**: Erro de CNPJ inválido

## 📊 VALIDAÇÕES IMPLEMENTADAS

### ✅ **Validações Matemáticas**
- [x] Balanço: Saldo Anterior + Receitas - Despesas = Saldo Final
- [x] Valores negativos: Receitas não podem ser negativas
- [x] Percentuais: Soma de categorias deve ser 100%
- [x] Outliers: Detecção via Z-Score (3 desvios padrão)

### ✅ **Validações de Dados**
- [x] CNPJ: Algoritmo completo de validação
- [x] Datas: Período entre 25-35 dias para mensal
- [x] Estrutura: Campos obrigatórios presentes

### ✅ **Configurações**
- [x] Tolerância de balanço: ±R$ 0,01
- [x] Tolerância de percentual: ±0,1%
- [x] Limite de outlier: 3 desvios padrão
- [x] Período mensal: 25-35 dias

## 🐛 TROUBLESHOOTING

### **Erro: "Cannot find module"**
- Certifique-se de que todos os arquivos foram criados
- Execute `npm install` se necessário

### **Erro: "Table does not exist"**
- Verifique se o SQL foi executado corretamente no Supabase
- Confirme se a tabela `financial_analysis` foi criada

### **Erro: "Function not found"**
- Verifique se as funções `get_financial_analysis` foram criadas
- Execute novamente o SQL no Supabase

### **Página não carrega**
- Verifique se a rota `/test-validation` foi adicionada
- Confirme se você está logado no sistema

## 📈 PRÓXIMOS PASSOS

Após testar com sucesso:

1. **Integrar com Upload**: Conectar validação ao modal de upload
2. **Implementar Fase 2.2**: Criar relatórios básicos
3. **Dashboard**: Adicionar métricas em tempo real
4. **Notificações**: Sistema de alertas para erros críticos

## 🎉 SUCESSO!

Se todos os testes passarem, o sistema de validação financeira está funcionando perfeitamente e você pode avançar para a próxima fase do desenvolvimento!
