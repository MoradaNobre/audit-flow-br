import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Users as UsersIcon, 
  Building2, 
  Mail, 
  Calendar,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface User {
  id: string;
  email: string;
  nome_completo: string;
  created_at: string;
  role: 'admin' | 'auditor' | 'condomino';
  condominios: Array<{
    id: string;
    nome: string;
    papel: string;
  }>;
}

interface Condominio {
  id: string;
  nome: string;
  cnpj: string;
}

export default function Users() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCondominio, setSelectedCondominio] = useState<string>('');
  const [selectedPapel, setSelectedPapel] = useState<string>('');
  const [showAssociationDialog, setShowAssociationDialog] = useState(false);

  // Fetch users with their associations
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users-with-associations'],
    queryFn: async () => {
      try {
        // Get all users from profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, nome_completo, created_at');
        
        if (profilesError) throw profilesError;
        if (!profiles) return [];

        // Get user roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');
        
        if (rolesError) throw rolesError;

        // Get user associations with condominios
        const { data: associations } = await supabase
          .from('associacoes_usuarios_condominios')
          .select('user_id, papel, condominio_id');

        // Get condominios data
        const { data: condominiosData } = await supabase
          .from('condominios')
          .select('id, nome');

        // Create users array with safe data access
        const usersData: User[] = profiles.map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.user_id);
          const userAssociations = associations?.filter(a => a.user_id === profile.user_id) || [];
          
          return {
            id: profile.user_id,
            email: profile.nome_completo || 'N/A', // Will be updated with real email later
            nome_completo: profile.nome_completo || 'N/A',
            created_at: profile.created_at,
            role: (userRole?.role as 'admin' | 'auditor' | 'condomino') || 'condomino',
            condominios: userAssociations.map(a => {
              const condominioInfo = condominiosData?.find(c => c.id === a.condominio_id);
              return {
                id: a.condominio_id,
                nome: condominioInfo?.nome || 'N/A',
                papel: a.papel
              };
            })
          };
        });

        return usersData;
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch condominios for association
  const { data: condominios } = useQuery({
    queryKey: ['condominios-for-association'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominios')
        .select('id, nome, cnpj')
        .order('nome');
      
      if (error) throw error;
      return data as Condominio[];
    },
    enabled: !!user,
  });

  // Associate user to condominio
  const associateUser = useMutation({
    mutationFn: async ({ userId, condominioId, papel }: { userId: string; condominioId: string; papel: string }) => {
      const { error } = await supabase
        .from('associacoes_usuarios_condominios')
        .insert({
          user_id: userId,
          condominio_id: condominioId,
          papel: papel as 'administrador' | 'condomino_auditor'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-associations'] });
      toast({ title: "Usuário associado com sucesso!" });
      setShowAssociationDialog(false);
      setSelectedUser(null);
      setSelectedCondominio('');
      setSelectedPapel('');
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao associar usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Remove association
  const removeAssociation = useMutation({
    mutationFn: async ({ userId, condominioId }: { userId: string; condominioId: string }) => {
      const { error } = await supabase
        .from('associacoes_usuarios_condominios')
        .delete()
        .eq('user_id', userId)
        .eq('condominio_id', condominioId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-associations'] });
      toast({ title: "Associação removida com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover associação",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const filteredUsers = users?.filter(user => 
    user.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-300';
      case 'auditor': return 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200 dark:text-gray-300';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'auditor': return 'Auditor';
      default: return 'Condômino';
    }
  };

  const handleAssociateUser = (user: User) => {
    setSelectedUser(user);
    setShowAssociationDialog(true);
  };

  const handleSubmitAssociation = () => {
    if (!selectedUser || !selectedCondominio || !selectedPapel) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o condomínio e o papel.",
        variant: "destructive"
      });
      return;
    }

    associateUser.mutate({
      userId: selectedUser.id,
      condominioId: selectedCondominio,
      papel: selectedPapel
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <UsersIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Gerenciar Usuários</h1>
                  <p className="text-sm text-muted-foreground">
                    Associe usuários aos condomínios
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Search and Filters */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
              Usuários ({filteredUsers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 border border-border/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </div>
                ))
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">
                            {user.nome_completo}
                          </h3>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleText(user.role)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        {user.condominios.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {user.condominios.map((cond) => (
                              <div
                                key={cond.id}
                                className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md text-xs"
                              >
                                <Building2 className="h-3 w-3" />
                                <span>{cond.nome}</span>
                                <span className="text-muted-foreground">({cond.papel})</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-auto p-0 w-4 h-4 text-destructive hover:text-destructive"
                                  onClick={() => removeAssociation.mutate({
                                    userId: user.id,
                                    condominioId: cond.id
                                  })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssociateUser(user)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Associar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Association Dialog */}
        <Dialog open={showAssociationDialog} onOpenChange={setShowAssociationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Associar Usuário ao Condomínio</DialogTitle>
              <DialogDescription>
                Associe {selectedUser?.nome_completo} a um condomínio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Condomínio</label>
                <Select value={selectedCondominio} onValueChange={setSelectedCondominio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condominios?.map((cond) => (
                      <SelectItem key={cond.id} value={cond.id}>
                        {cond.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Papel</label>
                <Select value={selectedPapel} onValueChange={setSelectedPapel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="morador">Morador</SelectItem>
                    <SelectItem value="sindico">Síndico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAssociationDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitAssociation}
                disabled={associateUser.isPending}
                className="flex-1"
              >
                {associateUser.isPending ? "Associando..." : "Associar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}