import { useState, useCallback, useEffect } from 'react';

interface UseTextSelectionProps {
  sourceType: 'chat' | 'faq';
  sourceId: string | null;
  containerId?: string;
  ready?: boolean; // Indicates when the container should be available
}

interface TextSelectionState {
  selectedText: string;
  anchorEl: HTMLElement | null;
  sourceContext: string;
}

export const useTextSelection = ({ sourceType, sourceId, containerId, ready = true }: UseTextSelectionProps) => {
  const [selectionState, setSelectionState] = useState<TextSelectionState>({
    selectedText: '',
    anchorEl: null,
    sourceContext: ''
  });

  const handleTextSelection = useCallback((event: Event) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 5) {
      // Get the context around the selection
      const range = selection?.getRangeAt(0);
      const container = range?.commonAncestorContainer;
      
      // Find the parent element that contains the full context
      let contextElement = container?.nodeType === Node.TEXT_NODE 
        ? container.parentElement 
        : container as Element;

      // Try to find a message or content container
      while (contextElement && !contextElement.classList.contains('message-content') && 
             !contextElement.classList.contains('faq-content') && 
             !contextElement.classList.contains('chat-message')) {
        contextElement = contextElement.parentElement;
      }

      const sourceContext = contextElement?.textContent?.slice(0, 500) || selectedText;

      // Create a virtual anchor element at the selection position
      const rect = range?.getBoundingClientRect();
      if (rect) {
        const virtualAnchor = document.createElement('div');
        virtualAnchor.style.position = 'absolute';
        virtualAnchor.style.left = `${rect.left + rect.width / 2}px`;
        virtualAnchor.style.top = `${rect.bottom}px`;
        virtualAnchor.style.width = '1px';
        virtualAnchor.style.height = '1px';
        virtualAnchor.style.pointerEvents = 'none';
        document.body.appendChild(virtualAnchor);

        setSelectionState({
          selectedText,
          anchorEl: virtualAnchor,
          sourceContext
        });

        // Clean up the virtual anchor after a delay
        setTimeout(() => {
          if (document.body.contains(virtualAnchor)) {
            document.body.removeChild(virtualAnchor);
          }
        }, 10000);
      }
    } else {
      // Clear selection if text is too short
      handleCloseMenu();
    }
  }, []);

  const handleCloseMenu = useCallback(() => {
    setSelectionState({
      selectedText: '',
      anchorEl: null,
      sourceContext: ''
    });
    
    // Clear text selection
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    
    const setupEventListener = () => {
      const container = containerId 
        ? document.getElementById(containerId)
        : document;

      if (container) {
        container.addEventListener('mouseup', handleTextSelection);
        return container;
      }
      return null;
    };

    // Try to set up immediately
    let container = setupEventListener();
    
    // If container not found and we have a specific containerId, retry after delays
    if (!container && containerId) {
      // Retry after short delays
      const retryTimeouts: NodeJS.Timeout[] = [];
      
      [100, 500, 1000, 2000].forEach(delay => {
        const timeout = setTimeout(() => {
          if (!container) {
            container = setupEventListener();
          }
        }, delay);
        retryTimeouts.push(timeout);
      });

      return () => {
        // Clear all timeouts
        retryTimeouts.forEach(timeout => clearTimeout(timeout));
        
        // Remove event listener if container was found
        if (container) {
          container.removeEventListener('mouseup', handleTextSelection);
        }
      };
    }
    
    return () => {
      if (container) {
        container.removeEventListener('mouseup', handleTextSelection);
      }
    };
  }, [handleTextSelection, containerId, ready]);

  return {
    selectedText: selectionState.selectedText,
    anchorEl: selectionState.anchorEl,
    sourceContext: selectionState.sourceContext,
    sourceType,
    sourceId,
    onClose: handleCloseMenu
  };
};
