'use client';

import { useEffect } from 'react';
import { useCompanyStore, useClientsStore, useDocumentsStore, useLettersStore, usePDFSettingsStore, useTenantStore } from '@/store';
import { useAuthStore } from '@/store/auth-store';

/**
 * Hook that initializes all data stores from the API after authentication.
 * Should be called once in the authenticated layout wrapper.
 */
export function useDataInit() {
  const { user, company: authCompany } = useAuthStore();
  const { setCompany, fetchCompany } = useCompanyStore();
  const { fetchClients, isLoaded: clientsLoaded } = useClientsStore();
  const { fetchDocuments, isLoaded: docsLoaded } = useDocumentsStore();
  const { fetchLetters, isLoaded: lettersLoaded } = useLettersStore();
  const { fetchSettings, isLoaded: settingsLoaded } = usePDFSettingsStore();
  const { fetchModuleStatus, isLoaded: modulesLoaded } = useTenantStore();

  useEffect(() => {
    if (!user) return;

    // Seed company store from auth data if available
    if (authCompany) {
      setCompany(authCompany);
    } else {
      fetchCompany();
    }

    // Fetch all data in parallel
    if (!clientsLoaded) fetchClients();
    if (!docsLoaded) fetchDocuments();
    if (!lettersLoaded) fetchLetters();
    if (!settingsLoaded) fetchSettings();
    if (!modulesLoaded) fetchModuleStatus();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
}
