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

const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  code,
  title = 'Mermaid Diagram',
  id,
  height = 400,
  onError
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Initialize Mermaid with configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
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
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code || !elementRef.current) {
        console.log('MermaidRenderer: Missing code or element ref');
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

        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // Clear the container
        elementRef.current.innerHTML = '';

        // Validate the diagram syntax first
        try {
          const parseResult = await mermaid.parse(cleanCode);
          console.log('MermaidRenderer: Parse result:', parseResult);
        } catch (parseError) {
          console.error('MermaidRenderer: Parse error:', parseError);
          throw new Error(`Ungültiger Mermaid-Code: ${parseError instanceof Error ? parseError.message : 'Syntax-Fehler'}`);
        }

        // Render the diagram
        const result = await mermaid.render(diagramId, cleanCode);
        console.log('MermaidRenderer: Render result keys:', Object.keys(result));
        
        let svg: string;
        if (typeof result === 'string') {
          svg = result;
        } else {
          svg = result.svg;
        }
        
        // Set the SVG content
        elementRef.current.innerHTML = svg;
        setSvgContent(svg);

        // Apply any interactive bindings if available
        if (typeof result === 'object' && result.bindFunctions) {
          result.bindFunctions(elementRef.current);
        }

        console.log('MermaidRenderer: Successfully rendered diagram');
        setIsLoading(false);
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
  }, [code, id, onError]);

  // Separate effect for scaling to avoid re-rendering
  useEffect(() => {
    if (elementRef.current) {
      const svgElement = elementRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = `scale(${scale})`;
        svgElement.style.transformOrigin = 'top left';
        svgElement.style.width = `${100 * scale}%`;
        svgElement.style.height = 'auto';
      }
    }
  }, [scale]);

  const handleDownload = async () => {
    if (!elementRef.current) return;

    try {
      const canvas = await html2canvas(elementRef.current, {
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
        ref={elementRef}
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
