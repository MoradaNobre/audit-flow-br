/**
 * Página de teste para validação financeira
 * Acesse via /test-validation para testar o sistema
 */

import React from 'react';
import { FinancialValidationTest } from '@/components/FinancialValidationTest';

export default function TestValidation() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <FinancialValidationTest />
      </div>
    </div>
  );
}
