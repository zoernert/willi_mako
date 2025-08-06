import React, { useEffect, useRef, useState } from 'react';
import { Box, Alert, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Download as DownloadIcon, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon } from '@mui/icons-material';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';

interface MermaidRendererProps {
  code: string;
  title?: string;
  id?: string;
  height?: number;
  onError?: (error: string) => void;
}

// Global Mermaid initialization - done once
let mermaidInitialized = false;

const initializeMermaid = () => {
  if (mermaidInitialized) return;
  
  console.log('MermaidRenderer: Initializing mermaid globally...');
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    themeVariables: {
      primaryColor: '#147a50',
      primaryTextColor: '#000000',
      primaryBorderColor: '#147a50',
      lineColor: '#333333',
      sectionBkgColor: '#f9f9f9',
      altSectionBkgColor: '#ffffff',
      gridColor: '#cccccc',
      secondaryColor: '#4a9b73',
      tertiaryColor: '#ffffff'
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis'
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: true,
      bottomMarginAdj: 1,
      useMaxWidth: true,
      rightAngles: false,
      showSequenceNumbers: false
    },
    gantt: {
      numberSectionStyles: 4,
      axisFormat: '%m/%d/%Y',
      topAxis: false
    }
  });
  
  mermaidInitialized = true;
  console.log('MermaidRenderer: Mermaid initialized globally');
};

const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  code,
  title = 'Mermaid Diagram',
  id,
  height = 400,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [diagramId] = useState(() => id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);

  // Initialize Mermaid once
  useEffect(() => {
    initializeMermaid();
  }, []);

  // Render diagram using direct DOM manipulation
  useEffect(() => {
    const renderDiagram = async () => {
      console.log('MermaidRenderer: Starting direct DOM render with:', {
        hasCode: !!code,
        codeLength: code?.length || 0,
        diagramId: diagramId
      });
      
      if (!code || !code.trim()) {
        console.log('MermaidRenderer: No code provided');
        setError('Kein Mermaid-Code verfügbar');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Clean the code - remove any markdown code block markers
        const cleanCode = code
          .replace(/^```mermaid\s*\n?/i, '')
          .replace(/\n?```\s*$/i, '')
          .trim();

        console.log('MermaidRenderer: Clean code:', cleanCode.substring(0, 100) + '...');

        if (!cleanCode) {
          throw new Error('Leerer Mermaid-Code');
        }

        // Create a temporary div element for rendering
        const tempDiv = document.createElement('div');
        tempDiv.id = diagramId;
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.position = 'absolute';
        tempDiv.style.top = '-9999px';
        tempDiv.style.left = '-9999px';
        tempDiv.style.pointerEvents = 'none';
        
        let tempDivAdded = false;
        
        try {
          document.body.appendChild(tempDiv);
          tempDivAdded = true;
          console.log('MermaidRenderer: Created temp div:', tempDiv.id);
        } catch (appendError) {
          console.error('MermaidRenderer: Failed to append temp div:', appendError);
          throw new Error('DOM-Element konnte nicht erstellt werden');
        }

        try {
          // Validate the diagram syntax first
          console.log('MermaidRenderer: Starting parse validation...');
          await mermaid.parse(cleanCode);
          console.log('MermaidRenderer: Parse successful');

          // Render the diagram directly to the temp div
          console.log('MermaidRenderer: Starting render...');
          const result = await mermaid.render(diagramId, cleanCode);
          console.log('MermaidRenderer: Render result type:', typeof result);
          
          let svg: string;
          if (typeof result === 'string') {
            svg = result;
          } else if (result && typeof result === 'object' && 'svg' in result) {
            svg = result.svg;
          } else {
            throw new Error('Unerwartetes Render-Ergebnis Format');
          }

          if (!svg || svg.trim().length === 0) {
            throw new Error('Leeres SVG-Ergebnis erhalten');
          }

          console.log('MermaidRenderer: Got SVG, length:', svg.length);

          // Set the SVG content and update the container
          setSvgContent(svg);
          
          // Use timeout to ensure the state update has taken effect
          setTimeout(() => {
            try {
              if (containerRef.current) {
                containerRef.current.innerHTML = svg;
                console.log('MermaidRenderer: SVG inserted into container');
                
                // Apply styling to the SVG
                const svgElement = containerRef.current.querySelector('svg');
                if (svgElement) {
                  svgElement.style.maxWidth = '100%';
                  svgElement.style.height = 'auto';
                  svgElement.style.display = 'block';
                  console.log('MermaidRenderer: SVG styling applied');
                } else {
                  console.warn('MermaidRenderer: No SVG element found in container');
                }
              } else {
                console.warn('MermaidRenderer: Container ref is null during SVG insertion');
              }
            } catch (insertError) {
              console.error('MermaidRenderer: Error inserting SVG:', insertError);
              const insertErrorMsg = insertError instanceof Error ? insertError.message : 'Fehler beim Anzeigen des Diagramms';
              setError('Fehler beim Anzeigen des Diagramms');
              onError?.(insertErrorMsg);
            }
            
            setIsLoading(false);
          }, 10);

        } catch (renderError) {
          console.error('MermaidRenderer: Render error:', renderError);
          
          // Try to extract meaningful error information
          let errorMessage = 'Fehler beim Rendern des Diagramms';
          if (renderError instanceof Error) {
            const errorStr = renderError.message.toLowerCase();
            if (errorStr.includes('parse')) {
              errorMessage = 'Syntax-Fehler im Mermaid-Code';
            } else if (errorStr.includes('lexer') || errorStr.includes('token')) {
              errorMessage = 'Ungültige Zeichen oder Syntax im Diagramm';
            } else if (errorStr.includes('node')) {
              errorMessage = 'Fehler in der Node-Definition';
            } else {
              errorMessage = `Diagramm-Fehler: ${renderError.message}`;
            }
          }
          
          setError(errorMessage);
          onError?.(errorMessage);
          setIsLoading(false);
        } finally {
          // Safely remove the temp div from body in finally block
          if (tempDivAdded && tempDiv) {
            try {
              if (document.body.contains(tempDiv)) {
                document.body.removeChild(tempDiv);
                console.log('MermaidRenderer: Temp div safely removed in finally');
              } else {
                console.log('MermaidRenderer: Temp div was already removed or not in body');
              }
            } catch (removeError) {
              console.warn('MermaidRenderer: Could not remove temp div (non-critical):', removeError);
            }
          }
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Fehler beim Rendern des Diagramms';
        console.error('MermaidRenderer: Full error:', err);
        console.error('MermaidRenderer: Code that failed:', code);
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
      }
    };

    renderDiagram();
  }, [code, diagramId, onError]);
  // Separate effect for scaling
  useEffect(() => {
    if (containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = `scale(${scale})`;
        svgElement.style.transformOrigin = 'top left';
        svgElement.style.width = `${100 * scale}%`;
        svgElement.style.height = 'auto';
      }
    }
  }, [scale]);

  const handleDownload = async () => {
    if (!containerRef.current) return;

    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: false
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading diagram:', err);
      setError('Fehler beim Export des Diagramms');
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: Math.min(height, 200),
          bgcolor: 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.300'
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <strong>Diagramm-Rendering Fehler:</strong> {error}
        <Box component="pre" sx={{ mt: 1, fontSize: '0.8rem', opacity: 0.7 }}>
          {code.substring(0, 200)}...
        </Box>
      </Alert>
    );
  }

  return (
    <Box sx={{ position: 'relative', bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
      {/* Controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        zIndex: 1,
        display: 'flex',
        gap: 1,
        bgcolor: 'rgba(255,255,255,0.9)',
        borderRadius: 1,
        p: 0.5
      }}>
        <Tooltip title="Vergrößern">
          <IconButton size="small" onClick={handleZoomIn} disabled={scale >= 2}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Verkleinern">
          <IconButton size="small" onClick={handleZoomOut} disabled={scale <= 0.5}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Als PNG herunterladen">
          <IconButton size="small" onClick={handleDownload}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Diagram Container */}
      <Box
        ref={containerRef}
        sx={{
          minHeight: height,
          overflow: scale > 1 ? 'auto' : 'visible',
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1,
          bgcolor: 'white',
          '& svg': {
            maxWidth: '100%',
            height: 'auto',
          }
        }}
      />

      {/* Scale indicator */}
      {scale !== 1 && (
        <Box sx={{ 
          position: 'absolute', 
          bottom: 8, 
          left: 8,
          bgcolor: 'rgba(0,0,0,0.7)',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem'
        }}>
          {Math.round(scale * 100)}%
        </Box>
      )}
    </Box>
  );
};

export default MermaidRenderer;
