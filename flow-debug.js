#!/usr/bin/env node
/**
 * CS30 Flow Debug Implementation
 * 
 * This module enhances the CS30 Chat Flow Debug Tool with advanced flow visualization
 * and analysis capabilities to better understand the reasoning process.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - can be overridden via command line args
const DEFAULT_CONFIG = {
  debugLogsDir: 'debug-logs',
  outputFormat: 'html', // 'html', 'markdown', or 'json'
  showTiming: true,
  showFlowDiagram: true,
  compareWithBaseline: false,
  baselineFile: null,
  embedMetrics: true
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  let debugFile = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--format' || arg === '-f') {
      config.outputFormat = args[++i];
    } else if (arg === '--no-timing') {
      config.showTiming = false;
    } else if (arg === '--no-diagram') {
      config.showFlowDiagram = false;
    } else if (arg === '--compare' || arg === '-c') {
      config.compareWithBaseline = true;
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        config.baselineFile = args[++i];
      }
    } else if (arg === '--no-metrics') {
      config.embedMetrics = false;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      debugFile = arg;
    }
  }

  return { config, debugFile };
}

/**
 * Show help information
 */
function showHelp() {
  console.log('CS30 Flow Debug - Visualize and analyze the CS30 chat flow debug data');
  console.log('');
  console.log('Usage: node flow-debug.js [options] <debug-file.json>');
  console.log('');
  console.log('Options:');
  console.log('  --format, -f <format>  Output format: html, markdown, or json (default: html)');
  console.log('  --no-timing            Disable timing metrics visualization');
  console.log('  --no-diagram           Disable flow diagram generation');
  console.log('  --compare, -c [file]   Compare with baseline file (optional)');
  console.log('  --no-metrics           Disable embedding of performance metrics');
  console.log('  --help, -h             Show this help information');
  console.log('');
  console.log('Examples:');
  console.log('  node flow-debug.js debug-logs/cs30-latest.json');
  console.log('  node flow-debug.js --format markdown debug-logs/cs30-wie_lege_ich_einen_vertrag_an_2025-08-22.json');
  console.log('  node flow-debug.js -c debug-logs/baseline.json debug-logs/cs30-latest.json');
}

/**
 * Find the most recent debug file
 */
function findLatestDebugFile(dir) {
  const files = fs.readdirSync(dir)
    .filter(file => file.startsWith('cs30-') && file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(dir, file),
      mtime: fs.statSync(path.join(dir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);
  
  if (files.length === 0) {
    console.error('No debug files found in', dir);
    process.exit(1);
  }
  
  return files[0].path;
}

/**
 * Load and parse a debug file
 */
function loadDebugFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading debug file ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Generate flow diagram from debug data using Mermaid syntax
 */
function generateFlowDiagram(debugData) {
  const flow = debugData.flow || [];
  if (flow.length === 0) return '';
  
  let mermaid = 'graph TD\n';
  mermaid += '  START[Start] --> QUERY[Query: ' + escapeForMermaid(truncateString(debugData.query, 30)) + ']\n';
  
  // Create a map of unique step names for tracking
  const nodes = new Map();
  nodes.set('START', 'START');
  nodes.set('QUERY', 'QUERY');
  
  let previousNode = 'QUERY';
  let nodeId = 0;
  
  flow.forEach((step, index) => {
    const name = step.name;
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    let nodeKey = sanitizedName;
    
    // If this node name already exists, create a unique variant
    if (nodes.has(sanitizedName)) {
      nodeKey = `${sanitizedName}_${++nodeId}`;
    }
    
    nodes.set(nodeKey, nodeKey);
    
    // Create a user-friendly label for the node
    const label = formatStepNameForDisplay(name);
    const timestamp = step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : '';
    
    // Add node with timing if available
    if (timestamp) {
      mermaid += `  ${nodeKey}["${label}<br/><small>${timestamp}</small>"]\n`;
    } else {
      mermaid += `  ${nodeKey}["${label}"]\n`;
    }
    
    // Connect to previous node
    mermaid += `  ${previousNode} --> ${nodeKey}\n`;
    
    // Set as previous for next iteration
    previousNode = nodeKey;
    
    // Add details as notes for certain important steps
    if (name.includes('SEARCH_RESULTS') || name.includes('GENERATION_COMPLETE')) {
      const details = typeof step.details === 'object' 
        ? JSON.stringify(step.details).substring(0, 50) + '...'
        : (step.details || '').substring(0, 50) + '...';
        
      if (details) {
        mermaid += `  ${nodeKey}_note[/"${escapeForMermaid(details)}"/]\n`;
        mermaid += `  ${nodeKey} -.-> ${nodeKey}_note\n`;
      }
    }
  });
  
  mermaid += `  ${previousNode} --> END[End]\n`;
  
  return mermaid;
}

/**
 * Generate timing metrics visualization
 */
function generateTimingMetrics(debugData) {
  const flow = debugData.flow || [];
  if (flow.length === 0) return '';
  
  // Create an array of steps with timestamps
  const stepsWithTimestamps = flow
    .filter(step => step.timestamp)
    .map(step => ({
      name: formatStepNameForDisplay(step.name),
      timestamp: new Date(step.timestamp).getTime()
    }));
  
  if (stepsWithTimestamps.length < 2) return '';
  
  // Calculate duration between steps
  const timingData = [];
  for (let i = 1; i < stepsWithTimestamps.length; i++) {
    const current = stepsWithTimestamps[i];
    const previous = stepsWithTimestamps[i - 1];
    const duration = current.timestamp - previous.timestamp;
    
    timingData.push({
      step: current.name,
      duration,
      startTime: previous.timestamp,
      endTime: current.timestamp
    });
  }
  
  // Total processing time
  const totalTime = debugData.metrics?.totalProcessingTime || 
    (stepsWithTimestamps[stepsWithTimestamps.length - 1].timestamp - stepsWithTimestamps[0].timestamp);
  
  // Prepare data for chart
  let mermaid = 'gantt\n';
  mermaid += '  title CS30 Processing Timeline\n';
  mermaid += '  dateFormat X\n';
  mermaid += '  axisFormat %S.%L\n';
  
  // Start from 0 for relative timing
  const startTime = stepsWithTimestamps[0].timestamp;
  
  // Add sections for major steps
  let currentSection = null;
  
  timingData.forEach((timing, index) => {
    // Create a new section for major steps
    const section = timing.step.split(' ')[0];
    if (section !== currentSection) {
      mermaid += `  section ${section}\n`;
      currentSection = section;
    }
    
    const relativeStart = timing.startTime - startTime;
    const relativeEnd = timing.endTime - startTime;
    mermaid += `  ${timing.step} : ${relativeStart}, ${timing.duration}ms\n`;
  });
  
  return mermaid;
}

/**
 * Generate HTML report from debug data
 */
function generateHTMLReport(debugData, config) {
  let flowDiagramHTML = '';
  let timingMetricsHTML = '';
  
  if (config.showFlowDiagram) {
    const mermaidFlowDiagram = generateFlowDiagram(debugData);
    flowDiagramHTML = `
    <div class="card">
      <h2>Flow Diagram</h2>
      <div class="mermaid">
${mermaidFlowDiagram}
      </div>
    </div>
    `;
  }
  
  if (config.showTiming) {
    const mermaidTiming = generateTimingMetrics(debugData);
    timingMetricsHTML = `
    <div class="card">
      <h2>Timing Metrics</h2>
      <div class="mermaid">
${mermaidTiming}
      </div>
    </div>
    `;
  }
  
  // Prepare search results
  const searchResults = debugData.cs30?.searchResults || [];
  let searchResultsHTML = '<p>No search results found</p>';
  if (searchResults.length > 0) {
    searchResultsHTML = `
    <div class="search-results">
      ${searchResults.map((result, i) => `
        <div class="result-item">
          <h3>${result.payload?.title || result.payload?.name || `Result ${i+1}`}</h3>
          <p><span class="score">Score: ${result.score.toFixed(4)}</span></p>
          <p>${result.payload?.contentPreview || truncateString(result.payload?.content || result.payload?.text || '', 200)}</p>
        </div>
      `).join('')}
    </div>
    `;
  }
  
  // Response comparison
  let responseComparisonHTML = '';
  if (debugData.response?.withoutCs30 && debugData.response?.onlyCs30) {
    responseComparisonHTML = `
    <div class="comparison">
      <div>
        <h3>Without CS30 Context</h3>
        <pre>${debugData.response.withoutCs30}</pre>
      </div>
      <div>
        <h3>With CS30 Context</h3>
        <pre>${debugData.response.onlyCs30}</pre>
      </div>
    </div>
    `;
  }
  
  // Baseline comparison
  let baselineComparisonHTML = '';
  if (config.compareWithBaseline && config.baselineData) {
    const baseline = config.baselineData;
    const compareMetrics = {
      'Total Processing Time': {
        baseline: formatTime(baseline.metrics?.totalProcessingTime),
        current: formatTime(debugData.metrics?.totalProcessingTime),
        diff: calcPercentDiff(baseline.metrics?.totalProcessingTime, debugData.metrics?.totalProcessingTime)
      },
      'CS30 Search Time': {
        baseline: formatTime(baseline.metrics?.cs30SearchTime),
        current: formatTime(debugData.metrics?.cs30SearchTime),
        diff: calcPercentDiff(baseline.metrics?.cs30SearchTime, debugData.metrics?.cs30SearchTime)
      },
      'Search Results Count': {
        baseline: baseline.cs30?.searchResults?.length || 0,
        current: debugData.cs30?.searchResults?.length || 0,
        diff: calcPercentDiff(baseline.cs30?.searchResults?.length || 0, debugData.cs30?.searchResults?.length || 0)
      },
      'Top Result Score': {
        baseline: baseline.cs30?.searchResults?.[0]?.score?.toFixed(4) || 'N/A',
        current: debugData.cs30?.searchResults?.[0]?.score?.toFixed(4) || 'N/A',
        diff: calcPercentDiff(baseline.cs30?.searchResults?.[0]?.score, debugData.cs30?.searchResults?.[0]?.score)
      }
    };
    
    baselineComparisonHTML = `
    <div class="card">
      <h2>Baseline Comparison</h2>
      <table>
        <tr>
          <th>Metric</th>
          <th>Baseline</th>
          <th>Current</th>
          <th>Difference</th>
        </tr>
        ${Object.entries(compareMetrics).map(([key, value]) => `
          <tr>
            <td>${key}</td>
            <td>${value.baseline}</td>
            <td>${value.current}</td>
            <td class="${getChangeClass(value.diff)}">${formatDiff(value.diff)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    `;
  }
  
  // Put everything together
  return `<!DOCTYPE html>
<html>
<head>
  <title>CS30 Flow Debug: ${truncateString(debugData.query, 30)}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      flowchart: { curve: 'basis' },
      gantt: { barHeight: 20, barGap: 4 }
    });
  </script>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
    .result-item { border-left: 4px solid #4CAF50; padding-left: 15px; margin-bottom: 15px; background: #f9f9f9; border-radius: 0 8px 8px 0; }
    .score { font-weight: bold; color: #1565C0; }
    .highlight { background-color: #FFEB3B; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
    th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .comparison { display: flex; gap: 20px; }
    .comparison > div { flex: 1; }
    pre { background-color: #f5f5f5; padding: 15px; overflow: auto; border-radius: 4px; }
    .improved { color: #4CAF50; }
    .declined { color: #F44336; }
    .neutral { color: #9E9E9E; }
    .mermaid { background: white; padding: 15px; border-radius: 8px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .metric-card { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
    .metric-name { font-size: 14px; color: #666; }
    .search-results { max-height: 500px; overflow-y: auto; }
    .step-list { list-style-type: none; padding-left: 0; }
    .step-list li { padding: 8px 12px; margin-bottom: 5px; background: #f5f5f5; border-radius: 4px; }
    .step-list li:nth-child(odd) { background: #e9e9e9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CS30 Flow Debug Report</h1>
      <p><strong>Query:</strong> ${debugData.query}</p>
      <p><strong>Timestamp:</strong> ${debugData.timestamp}</p>
    </div>
    
    <div class="card">
      <h2>Summary</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-name">Total Processing Time</div>
          <div class="metric-value">${formatTime(debugData.metrics?.totalProcessingTime)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-name">CS30 Search Time</div>
          <div class="metric-value">${formatTime(debugData.metrics?.cs30SearchTime)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-name">Results Found</div>
          <div class="metric-value">${debugData.cs30?.searchResults?.length || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-name">Top Result Score</div>
          <div class="metric-value">${debugData.cs30?.searchResults?.[0]?.score?.toFixed(4) || 'N/A'}</div>
        </div>
      </div>
    </div>
    
    ${flowDiagramHTML}
    
    ${timingMetricsHTML}
    
    <div class="card">
      <h2>Search Results</h2>
      ${searchResultsHTML}
    </div>
    
    <div class="card">
      <h2>Response Comparison</h2>
      ${responseComparisonHTML}
    </div>
    
    ${baselineComparisonHTML}
    
    <div class="card">
      <h2>Flow Steps</h2>
      <ul class="step-list">
        ${(debugData.flow || []).map(step => `
          <li>
            <strong>${formatStepNameForDisplay(step.name)}</strong>
            ${step.timestamp ? `<small> (${new Date(step.timestamp).toLocaleTimeString()})</small>` : ''}
            ${step.details ? `<pre>${typeof step.details === 'object' ? JSON.stringify(step.details, null, 2) : step.details}</pre>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
    
    <div class="card">
      <h2>Command Line Options</h2>
      <table>
        <tr>
          <th>Option</th>
          <th>Value</th>
        </tr>
        ${Object.entries(debugData.commandLineOptions || {}).map(([k, v]) => 
          `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
      </table>
    </div>
    
    ${debugData.response?.analysis ? `
    <div class="card">
      <h2>Analysis</h2>
      <pre>${debugData.response.analysis}</pre>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Generate Markdown report from debug data
 */
function generateMarkdownReport(debugData, config) {
  let flowDiagramMD = '';
  let timingMetricsMD = '';
  
  if (config.showFlowDiagram) {
    const mermaidFlowDiagram = generateFlowDiagram(debugData);
    flowDiagramMD = `
## Flow Diagram

\`\`\`mermaid
${mermaidFlowDiagram}
\`\`\`
`;
  }
  
  if (config.showTiming) {
    const mermaidTiming = generateTimingMetrics(debugData);
    timingMetricsMD = `
## Timing Metrics

\`\`\`mermaid
${mermaidTiming}
\`\`\`
`;
  }
  
  // Prepare search results
  const searchResults = debugData.cs30?.searchResults || [];
  let searchResultsMD = 'No search results found';
  if (searchResults.length > 0) {
    searchResultsMD = searchResults.map((result, i) => `
### Result ${i+1}: ${result.payload?.title || result.payload?.name || 'Untitled'}

- **Score:** ${result.score.toFixed(4)}
- **Content:** ${truncateString(result.payload?.contentPreview || result.payload?.content || result.payload?.text || '', 200)}
`).join('\n');
  }
  
  // Response comparison
  let responseComparisonMD = '';
  if (debugData.response?.withoutCs30 && debugData.response?.onlyCs30) {
    responseComparisonMD = `
## Response Comparison

### Without CS30 Context

\`\`\`
${debugData.response.withoutCs30}
\`\`\`

### With CS30 Context

\`\`\`
${debugData.response.onlyCs30}
\`\`\`
`;
  }
  
  // Baseline comparison
  let baselineComparisonMD = '';
  if (config.compareWithBaseline && config.baselineData) {
    const baseline = config.baselineData;
    
    baselineComparisonMD = `
## Baseline Comparison

| Metric | Baseline | Current | Difference |
|--------|----------|---------|------------|
| Total Processing Time | ${formatTime(baseline.metrics?.totalProcessingTime)} | ${formatTime(debugData.metrics?.totalProcessingTime)} | ${formatDiff(calcPercentDiff(baseline.metrics?.totalProcessingTime, debugData.metrics?.totalProcessingTime))} |
| CS30 Search Time | ${formatTime(baseline.metrics?.cs30SearchTime)} | ${formatTime(debugData.metrics?.cs30SearchTime)} | ${formatDiff(calcPercentDiff(baseline.metrics?.cs30SearchTime, debugData.metrics?.cs30SearchTime))} |
| Search Results Count | ${baseline.cs30?.searchResults?.length || 0} | ${debugData.cs30?.searchResults?.length || 0} | ${formatDiff(calcPercentDiff(baseline.cs30?.searchResults?.length || 0, debugData.cs30?.searchResults?.length || 0))} |
| Top Result Score | ${baseline.cs30?.searchResults?.[0]?.score?.toFixed(4) || 'N/A'} | ${debugData.cs30?.searchResults?.[0]?.score?.toFixed(4) || 'N/A'} | ${formatDiff(calcPercentDiff(baseline.cs30?.searchResults?.[0]?.score, debugData.cs30?.searchResults?.[0]?.score))} |
`;
  }
  
  // Steps list
  const stepsMD = (debugData.flow || []).map(step => `
- **${formatStepNameForDisplay(step.name)}** ${step.timestamp ? `(${new Date(step.timestamp).toLocaleTimeString()})` : ''}
  ${step.details ? `\`\`\`json\n${typeof step.details === 'object' ? JSON.stringify(step.details, null, 2) : step.details}\n\`\`\`` : ''}
`).join('\n');
  
  // Put everything together
  return `# CS30 Flow Debug Report

**Query:** ${debugData.query}  
**Timestamp:** ${debugData.timestamp}

## Summary

- **Total Processing Time:** ${formatTime(debugData.metrics?.totalProcessingTime)}
- **CS30 Search Time:** ${formatTime(debugData.metrics?.cs30SearchTime)}
- **Results Found:** ${debugData.cs30?.searchResults?.length || 0}
- **Top Result Score:** ${debugData.cs30?.searchResults?.[0]?.score?.toFixed(4) || 'N/A'}

${flowDiagramMD}

${timingMetricsMD}

## Search Results

${searchResultsMD}

${responseComparisonMD}

${baselineComparisonMD}

## Flow Steps

${stepsMD}

## Command Line Options

| Option | Value |
|--------|-------|
${Object.entries(debugData.commandLineOptions || {}).map(([k, v]) => 
  `| ${k} | ${v} |`).join('\n')}

${debugData.response?.analysis ? `
## Analysis

\`\`\`
${debugData.response.analysis}
\`\`\`
` : ''}
`;
}

/**
 * Helper function to escape special characters for Mermaid
 */
function escapeForMermaid(text) {
  if (!text) return '';
  return text
    .replace(/"/g, "'")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Helper function to format step names for display
 */
function formatStepNameForDisplay(name) {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Helper function to truncate strings
 */
function truncateString(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * Helper function to format time in ms
 */
function formatTime(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Helper function to calculate percentage difference
 */
function calcPercentDiff(baseline, current) {
  if (!baseline || !current) return null;
  return ((current - baseline) / baseline) * 100;
}

/**
 * Helper function to format difference value
 */
function formatDiff(diff) {
  if (diff === null) return 'N/A';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

/**
 * Helper function to get CSS class for change
 */
function getChangeClass(diff) {
  if (diff === null) return 'neutral';
  // For timing metrics, negative is good (faster)
  if (diff < -5) return 'improved';
  if (diff > 5) return 'declined';
  return 'neutral';
}

/**
 * Main function
 */
async function main() {
  // Parse arguments
  const { config, debugFile } = parseArgs();
  
  // Find debug file
  const debugFilePath = debugFile || findLatestDebugFile(config.debugLogsDir);
  console.log(`Using debug file: ${debugFilePath}`);
  
  // Load debug data
  const debugData = loadDebugFile(debugFilePath);
  
  // Load baseline data if specified
  if (config.compareWithBaseline) {
    if (config.baselineFile) {
      console.log(`Using baseline file: ${config.baselineFile}`);
      config.baselineData = loadDebugFile(config.baselineFile);
    } else {
      // Try to find a baseline file with the same query
      const query = debugData.query;
      const files = fs.readdirSync(config.debugLogsDir)
        .filter(file => 
          file.startsWith('cs30-') && 
          file.endsWith('.json') && 
          file !== path.basename(debugFilePath) &&
          file.includes(query.slice(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase())
        )
        .map(file => ({
          name: file,
          path: path.join(config.debugLogsDir, file),
          mtime: fs.statSync(path.join(config.debugLogsDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      if (files.length > 0) {
        console.log(`Using automatic baseline file: ${files[0].path}`);
        config.baselineData = loadDebugFile(files[0].path);
      } else {
        console.log('No baseline file found with similar query');
      }
    }
  }
  
  // Generate report based on format
  let output;
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  let outputFilename;
  
  if (config.outputFormat === 'html') {
    output = generateHTMLReport(debugData, config);
    outputFilename = `cs30-flow-${timestamp}.html`;
  } else if (config.outputFormat === 'markdown') {
    output = generateMarkdownReport(debugData, config);
    outputFilename = `cs30-flow-${timestamp}.md`;
  } else {
    // JSON format - enhanced with flow metrics
    if (config.embedMetrics) {
      // Calculate step durations
      const flow = debugData.flow || [];
      if (flow.length > 1) {
        for (let i = 1; i < flow.length; i++) {
          const current = flow[i];
          const previous = flow[i - 1];
          if (current.timestamp && previous.timestamp) {
            const currentTime = new Date(current.timestamp).getTime();
            const previousTime = new Date(previous.timestamp).getTime();
            flow[i].duration = currentTime - previousTime;
          }
        }
      }
      
      // Add flow metrics
      debugData.flowMetrics = {
        totalSteps: flow.length,
        stepCategories: countStepCategories(flow),
        longestSteps: getLongestSteps(flow, 3),
        averageStepDuration: calculateAverageStepDuration(flow)
      };
    }
    
    output = JSON.stringify(debugData, null, 2);
    outputFilename = `cs30-flow-${timestamp}.json`;
  }
  
  // Write output file
  const outputPath = path.join(config.debugLogsDir, outputFilename);
  fs.writeFileSync(outputPath, output);
  console.log(`Report generated: ${outputPath}`);
  
  // Open the file if HTML
  if (config.outputFormat === 'html') {
    try {
      console.log('Opening report in browser...');
      if (process.platform === 'win32') {
        execSync(`start ${outputPath}`);
      } else if (process.platform === 'darwin') {
        execSync(`open ${outputPath}`);
      } else {
        execSync(`xdg-open ${outputPath}`);
      }
    } catch (error) {
      console.log('Could not open browser automatically, please open the file manually');
    }
  }
}

/**
 * Count steps by category
 */
function countStepCategories(flow) {
  const categories = {};
  flow.forEach(step => {
    const category = step.name.split('_')[0];
    categories[category] = (categories[category] || 0) + 1;
  });
  return categories;
}

/**
 * Get the N longest steps by duration
 */
function getLongestSteps(flow, n) {
  return flow
    .filter(step => step.duration)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, n)
    .map(step => ({
      name: step.name,
      duration: step.duration
    }));
}

/**
 * Calculate average step duration
 */
function calculateAverageStepDuration(flow) {
  const stepsWithDuration = flow.filter(step => step.duration);
  if (stepsWithDuration.length === 0) return null;
  
  const totalDuration = stepsWithDuration.reduce((sum, step) => sum + step.duration, 0);
  return totalDuration / stepsWithDuration.length;
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
