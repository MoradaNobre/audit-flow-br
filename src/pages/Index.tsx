import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Plus, BarChart3, FileText, Clock, Building2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useCondominios } from '@/hooks/useCondominios';
import { usePrestacoes } from '@/hooks/usePrestacoes';
import { UploadModal } from '@/components/UploadModal';
import { CreateCondominioModal } from '@/components/CreateCondominioModal';

const Index = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createCondominioModalOpen, setCreateCondominioModalOpen] = useState(false);

  // Fetch data with React Query
  const { data: condominios, isLoading: condominiosLoading, error: condominiosError } = useCondominios();
  const { data: prestacoes, isLoading: prestacoesLoading } = usePrestacoes();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message
      });
    }
  };

  // Calculate statistics
  const totalRelatorios = prestacoes?.length || 0;
  const relatoriosConcluidos = prestacoes?.filter(p => p.status_analise === 'concluido').length || 0;
  const analisesPendentes = prestacoes?.filter(p => p.status_analise === 'pendente').length || 0;
  const condominiosAtivos = condominios?.length || 0;

  if (condominiosError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Erro ao carregar dados</h1>
          <p className="text-muted-foreground">Tente recarregar a página</p>
          <Button onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AuditFlow</h1>
                <p className="text-sm text-muted-foreground">Dashboard Principal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">Bem-vindo!</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Relatórios Concluídos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {condominiosLoading ? '-' : relatoriosConcluidos}
              </div>
              <p className="text-xs text-muted-foreground">
                +{Math.max(0, relatoriosConcluidos - 10)} desde o último mês
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Análises Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {prestacoesLoading ? '-' : analisesPendentes}
              </div>
              <p className="text-xs text-muted-foreground">
                Aguardando processamento
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Condomínios Ativos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {condominiosLoading ? '-' : condominiosAtivos}
              </div>
              <p className="text-xs text-muted-foreground">
                Em monitoramento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main CTA */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Faça Novo Upload de Documento</CardTitle>
            <CardDescription>
              Envie uma prestação de contas para análise automatizada
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button 
              size="lg" 
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => setUploadModalOpen(true)}
              disabled={!condominios || condominios.length === 0}
            >
              <Plus className="h-5 w-5" />
              Iniciar Nova Análise
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2"
              onClick={() => setCreateCondominioModalOpen(true)}
            >
              <Building2 className="h-5 w-5" />
              Novo Condomínio
            </Button>
          </CardContent>
        </Card>

        {/* Meus Condomínios */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Meus Condomínios</h2>
            <p className="text-muted-foreground">Gerencie as prestações de contas dos seus condomínios</p>
          </div>
          
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {condominiosLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : condominios && condominios.length > 0 ? (
              // Real condominios data
              condominios.map((condominio) => (
                <Card 
                  key={condominio.id}
                  className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/condominio/${condominio.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{condominio.nome}</CardTitle>
                        <CardDescription>
                          {condominio.cnpj ? `CNPJ: ${condominio.cnpj}` : 'CNPJ não informado'}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Ativo</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Criado em:</span>
                      <span className="font-medium">
                        {new Date(condominio.created_at).toLocaleDateString('pt-BR', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Empty state
              <div className="col-span-full">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="text-center py-8">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhum condomínio cadastrado
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Comece criando seu primeiro condomínio para gerenciar prestações de contas.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setCreateCondominioModalOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Primeiro Condomínio
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
        condominios={condominios || []}
      />
      
      <CreateCondominioModal 
        open={createCondominioModalOpen}
        onOpenChange={setCreateCondominioModalOpen}
      />
    </div>
  );
};

export default Index;
