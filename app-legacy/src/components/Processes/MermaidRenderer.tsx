import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';

export interface MermaidRendererHandles {
  export: () => void;
}

interface MermaidRendererProps {
  code: string;
  diagramId: string;
  title?: string;
  onError?: (error: string) => void;
}

const MermaidRenderer = forwardRef<MermaidRendererHandles, MermaidRendererProps>(
  ({ code, diagramId, title = 'Mermaid Diagram', onError }, ref) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    console.log(`MermaidRenderer: Component created for ${diagramId}`);

    // Initialize Mermaid once globally
    useEffect(() => {
      const initializeMermaid = async () => {
        try {
          console.log('MermaidRenderer: Initializing Mermaid...');
          
          // Make mermaid globally available
          if (typeof window !== 'undefined') {
            (window as any).mermaid = mermaid;
          }

          // Initialize with safe configuration
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'Arial, sans-serif',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
            }
          });
          
          console.log('✅ Mermaid initialized successfully');
          setMounted(true);
        } catch (initError) {
          console.error('❌ Mermaid initialization failed:', initError);
          setError('Diagramm-Bibliothek konnte nicht geladen werden');
          setLoading(false);
        }
      };

      initializeMermaid();

      return () => {
        setMounted(false);
      };
    }, []);

    // Render diagram when everything is ready
    useEffect(() => {
      if (!mounted || !code || !containerRef.current || error) {
        console.log(`MermaidRenderer: Waiting for prerequisites - ${diagramId}`, {
          mounted,
          hasCode: !!code,
          hasContainer: !!containerRef.current,
          hasError: !!error
        });
        return;
      }

      const renderDiagram = async () => {
        try {
          console.log(`MermaidRenderer: Starting render for ${diagramId}`);
          setLoading(true);
          setError(null);

          // Clear container
          containerRef.current!.innerHTML = '';

          // Generate unique render ID
          const renderDiagramId = `${diagramId}-${Date.now()}`;

          // Clean the code
          const cleanCode = code
            .replace(/^```mermaid\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim();

          if (!cleanCode) {
            throw new Error('Leerer Mermaid-Code');
          }

          // Render the diagram
          const { svg } = await mermaid.render(renderDiagramId, cleanCode);
          
          // Insert SVG into container
          if (containerRef.current && mounted) {
            containerRef.current.innerHTML = svg;
            console.log(`✅ Successfully rendered ${diagramId}`);
          }
          
          setLoading(false);
        } catch (renderError) {
          console.error(`❌ Render failed for ${diagramId}:`, renderError);
          const errorMsg = renderError instanceof Error ? renderError.message : 'Unbekannt';
          setError(`Render-Fehler: ${errorMsg}`);
          onError?.(errorMsg);
          setLoading(false);
        }
      };

      renderDiagram();
    }, [mounted, code, diagramId, error, onError]);

    // Export functionality
    const handleDownload = async () => {
      if (!containerRef.current) {
        console.warn(`MermaidRenderer: Export failed - no container for ${diagramId}`);
        return;
      }

      try {
        const canvas = await html2canvas(containerRef.current, {
          backgroundColor: 'white',
          scale: 2,
        });

        const link = document.createElement('a');
        link.download = `diagram-${diagramId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        console.log(`✅ Export completed for ${diagramId}`);
      } catch (exportError) {
        console.error(`❌ Export failed for ${diagramId}:`, exportError);
      }
    };

    useImperativeHandle(ref, () => ({
      export: handleDownload,
    }), []);

    return (
      <Box 
        sx={{ 
          width: '100%', 
          minHeight: '200px',
          borderRadius: 1,
          bgcolor: 'background.paper',
          p: 2,
          position: 'relative'
        }}
      >

        {loading && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
            <CircularProgress size={40} />
            <Typography variant="body2">Lädt Diagramm für {diagramId}...</Typography>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Fehler in {diagramId}:</strong> {error}
            </Typography>
          </Alert>
        )}

        {/* Container for Mermaid diagram */}
        <div
          ref={containerRef}
          id={diagramId}
          style={{
            width: '100%',
            minHeight: '150px',
            backgroundColor: loading ? '#f5f5f5' : 'white',
            marginTop: '8px'
          }}
        />
      </Box>
    );
  }
);

MermaidRenderer.displayName = 'MermaidRenderer';

export default MermaidRenderer;
