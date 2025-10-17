/**
 * Utility functions for processing AI responses
 */

/**
 * Clean AI response text to extract JSON from markdown code blocks
 * @param response Raw response from AI service
 * @returns Cleaned JSON string
 */
export function cleanJsonResponse(response: string): string {
  let cleanResponse = response.trim();
  
  // Remove markdown code block markers if present
  if (cleanResponse.startsWith('```json')) {
    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanResponse.startsWith('```')) {
    // Handle generic code blocks
    const firstNewline = cleanResponse.indexOf('\n');
    const lastNewline = cleanResponse.lastIndexOf('\n');
    if (firstNewline > 0 && lastNewline > firstNewline) {
      cleanResponse = cleanResponse.slice(firstNewline + 1, lastNewline).trim();
    } else {
      // Fallback: just remove the code block markers
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
  }
  
  // Fix common AI response issues with quotes
  // Remove triple quotes that might appear at beginning/end
  cleanResponse = cleanResponse
    .replace(/^"""/, '')
    .replace(/"""$/, '')
    .replace(/^"/, '')
    .replace(/"$/, '');
  
  return cleanResponse;
}

function stripJsonComments(input: string): string {
  let result = '';
  let index = 0;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let inTemplate = false;
  let escaped = false;

  while (index < input.length) {
    const char = input[index];
    const next = input[index + 1];

    if (escaped) {
      result += char;
      escaped = false;
      index += 1;
      continue;
    }

    if (char === '\\' && (inDoubleQuote || inSingleQuote || inTemplate)) {
      escaped = true;
      result += char;
      index += 1;
      continue;
    }

    if (!inSingleQuote && !inTemplate && char === '"') {
      inDoubleQuote = !inDoubleQuote;
      result += char;
      index += 1;
      continue;
    }

    if (!inDoubleQuote && !inTemplate && char === "'") {
      inSingleQuote = !inSingleQuote;
      result += char;
      index += 1;
      continue;
    }

    if (!inDoubleQuote && !inSingleQuote && char === '`') {
      inTemplate = !inTemplate;
      result += char;
      index += 1;
      continue;
    }

    if (inDoubleQuote || inSingleQuote || inTemplate) {
      result += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      index += 2;
      while (index < input.length && input[index] !== '\n') {
        index += 1;
      }
      if (index < input.length) {
        result += '\n';
        index += 1;
      }
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < input.length) {
        const current = input[index];
        const upcoming = input[index + 1];
        if (current === '*' && upcoming === '/') {
          index += 2;
          break;
        }
        if (current === '\n') {
          result += '\n';
        }
        index += 1;
      }
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

/**
 * Safely parse JSON from AI response with automatic cleaning and fixing
 * @param response Raw response from AI service
 * @returns Parsed JSON object or null if parsing fails
 */
export function safeParseJsonResponse(response: string): any | null {
  try {
    let cleanResponse = cleanJsonResponse(response);

    cleanResponse = stripJsonComments(cleanResponse);
    // First attempt: try direct parsing
    try {
      return JSON.parse(cleanResponse);
    } catch (firstError) {
      console.log('First JSON parse failed, attempting to fix quote escaping...');
      
      // Second attempt: fix common quote escaping patterns found in AI responses
      let fixedResponse = cleanResponse
        // Fix the specific pattern: Use-Case "text" within string values
        .replace(/(:\s*"[^"]*?)Use-Case "([^"]+)"([^"]*?")/g, '$1Use-Case \\"$2\\"$3')
        // Fix quotes around any text within string values (general pattern)
        .replace(/(:\s*"[^"]*?)"([^"]+)"([^"]*?")/g, '$1\\"$2\\"$3')
        // Fix multiple quotes within the same string value
        .replace(/(:\s*"[^"]*?)"([^"]+)"([^"]*?)"([^"]+)"([^"]*?")/g, '$1\\"$2\\"$3\\"$4\\"$5');
      
      try {
        return JSON.parse(fixedResponse);
      } catch (secondError) {
        console.log('Second JSON parse failed, trying more aggressive fixing...');
        
        // Third attempt: more aggressive quote fixing
        // Split the JSON into lines and fix each line individually
        const lines = cleanResponse.split('\n');
        const fixedLines = lines.map(line => {
          // If this line contains a JSON value (has : and ends with " or ",)
          if (line.includes(':') && (line.trim().endsWith('",') || line.trim().endsWith('"'))) {
            // Find the start and end of the string value
            const colonIndex = line.indexOf(':');
            const startQuoteIndex = line.indexOf('"', colonIndex);
            
            if (startQuoteIndex !== -1) {
              const beforeValue = line.substring(0, startQuoteIndex + 1);
              const afterValueStart = line.lastIndexOf('"');
              
              if (afterValueStart > startQuoteIndex) {
                const stringValue = line.substring(startQuoteIndex + 1, afterValueStart);
                const afterValue = line.substring(afterValueStart);
                
                const escapedValue = JSON.stringify(stringValue).slice(1, -1);
                return beforeValue + escapedValue + afterValue;
              }
            }
          }
          return line;
        });
        
        const reconstructedJson = fixedLines.join('\n');
        
        try {
          return JSON.parse(reconstructedJson);
        } catch (thirdError) {
          console.error('All JSON parsing attempts failed');
          console.error('Original error:', firstError instanceof Error ? firstError.message : String(firstError));
          console.error('Second error:', secondError instanceof Error ? secondError.message : String(secondError));
          console.error('Third error:', thirdError instanceof Error ? thirdError.message : String(thirdError));
          
          // Show a sample of the problematic content for debugging
          const problemLines = lines.filter(line => line.includes(':') && line.includes('"') && line.split('"').length > 3);
          if (problemLines.length > 0) {
            console.error('Problematic lines:', problemLines.slice(0, 3));
          }
          
          return null;
        }
      }
    }
  } catch (error) {
    console.error('Error in safeParseJsonResponse:', error);
    console.error('Raw response:', response);
    return null;
  }
}
