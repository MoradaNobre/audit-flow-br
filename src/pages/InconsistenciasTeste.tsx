import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInconsistenciasByRelatorio } from '@/hooks/useInconsistencias';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2, ListChecks } from 'lucide-react';

export default function InconsistenciasTeste() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useInconsistenciasByRelatorio(id);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <ListChecks className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Inconsistências (texto)</h1>
              <p className="text-sm text-muted-foreground">Apenas descrições reais do relatório</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/relatorio/${id}`}>Voltar ao Relatório</Link>
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 py-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Descrições encontradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Erro ao carregar inconsistências.
              </div>
            )}

            {!isLoading && !error && (
              <div className="space-y-3">
                {data && data.length > 0 ? (
                  data.map((inc) => (
                    <p key={inc.id} className="text-foreground">- {inc.descricao}</p>
                  ))
                ) : (
                  <p className="text-muted-foreground">Nenhuma inconsistência encontrada.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
