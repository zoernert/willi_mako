import React from 'react';
import MermaidRenderer from './app-legacy/src/components/Processes/MermaidRenderer';

const testMermaidCode = `
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
`;

const MermaidTest = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1>Mermaid Renderer Test</h1>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h2>Simple Flowchart</h2>
        <MermaidRenderer 
          code={testMermaidCode}
          title="Test Flowchart"
          height={300}
          onError={(error) => console.error('Mermaid Error:', error)}
        />
      </div>
    </div>
  );
};

export default MermaidTest;
