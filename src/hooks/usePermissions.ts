import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useRoles';

export const usePermissions = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();

  const isAdmin = userRole === 'admin';
  const isAuditor = userRole === 'auditor';
  const isCondomino = userRole === 'condomino';

  // Permissões específicas
  const canCreateCondominios = isAdmin;
  const canEditCondominios = isAdmin;
  const canDeleteCondominios = isAdmin;
  
  const canCreatePrestacoes = isAdmin || isAuditor;
  const canAnalyzePrestacoes = isAdmin || isAuditor;
  
  const canViewRelatorios = true; // Todos podem ver
  const canDeleteRelatorios = isAdmin;
  
  const canManageUsers = isAdmin;
  const canConfigureLLM = isAdmin;
  
  return {
    user,
    userRole,
    isAdmin,
    isAuditor,
    isCondomino,
    canCreateCondominios,
    canEditCondominios,
    canDeleteCondominios,
    canCreatePrestacoes,
    canAnalyzePrestacoes,
    canViewRelatorios,
    canDeleteRelatorios,
    canManageUsers,
    canConfigureLLM,
  };
};