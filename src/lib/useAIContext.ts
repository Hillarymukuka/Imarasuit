import { useEffect } from 'react';
import { useAIAssistantStore } from '@/store/ai-store';

/**
 * Call at the top of each page component to tell the AI assistant
 * which section the user is currently working in.
 *
 * Example: useAIContext('Quotations');
 */
export function useAIContext(context: string) {
  const setPageContext = useAIAssistantStore((s) => s.setPageContext);
  useEffect(() => {
    setPageContext(context);
  }, [context, setPageContext]);
}
