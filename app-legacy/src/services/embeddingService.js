/**
 * Embedding Service for the React Legacy App
 * 
 * This service handles embedding generation and HyDE (Hypothetical Document Embeddings)
 * for improved semantic search.
 */

import axios from 'axios';

// Cache für collection dimensions
const collectionDimensions = {
  'cs30': 1536,    // Standard für text-embedding-004
  'willi_mako': 1536
};

/**
 * Generate an embedding for the provided text
 * @param {string} text Text to generate embedding for
 * @param {string} collection Optional collection name to ensure correct dimensions
 * @returns {Promise<Array>} Embedding vector
 */
export async function generateEmbedding(text, collection = 'cs30') {
  try {
    // Prüfen, ob wir die Dimension für diese Collection bereits kennen
    if (!collectionDimensions[collection]) {
      // Wenn nicht bekannt, versuche die Dimension vom Server zu erhalten
      await fetchCollectionDimension(collection);
    }
    
    const response = await axios.post('/api/embeddings', {
      text,
      model: 'text-embedding-004',
      collection: collection // Füge collection als Kontext für den Server hinzu
    });
    
    // Überprüfe, ob die Dimension stimmt
    const embedding = response.data.embedding;
    if (embedding.length !== collectionDimensions[collection]) {
      console.warn(`Embedding dimension mismatch for ${collection}: got ${embedding.length}, expected ${collectionDimensions[collection]}`);
      
      // Aktualisiere unser Wissen über die Sammlung
      collectionDimensions[collection] = embedding.length;
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Fetch the dimension for a collection from Qdrant
 * @param {string} collection Collection name
 * @returns {Promise<number>} Vector dimension
 */
export async function fetchCollectionDimension(collection) {
  try {
    const response = await axios.get(`/api/collection-info/${collection}`);
    if (response.data && response.data.dimension) {
      collectionDimensions[collection] = response.data.dimension;
      console.log(`Updated dimension for ${collection}: ${response.data.dimension}`);
    }
    return collectionDimensions[collection];
  } catch (error) {
    console.error(`Error fetching dimension for ${collection}:`, error);
    // Behalte den Standardwert bei
    return collectionDimensions[collection] || 1536;
  }
}

/**
 * Generate a hypothetical answer for HyDE approach
 * @param {string} query User query
 * @param {string} collection Collection to generate HyDE for (impacts prompt)
 * @returns {Promise<string>} Hypothetical answer
 */
export async function generateHypotheticalAnswer(query, collection = 'cs30') {
  try {
    // Angepasster Prompt je nach Collection
    let prompt = '';
    
    if (collection === 'cs30') {
      prompt = `Du bist ein Experte für die Schleupen CS/30 Software und die deutsche Energiewirtschaft. 
Beantworte die folgende Frage prägnant und sachlich mit Fokus auf praktische Anwendungen in CS/30. 
Konzentriere dich auf konkrete Arbeitsabläufe, Menüpfade und Softwarebedienung.
Gib nur die Antwort aus, ohne einleitende Sätze.

Frage: ${query}

Antwort:`;
    } else {
      prompt = `Du bist ein Experte für die deutsche Energiewirtschaft und Marktkommunikation. 
Beantworte die folgende Frage prägnant und sachlich mit Fokus auf Marktprozesse, Regularien und Best Practices. 
Gib nur die Antwort aus, ohne einleitende Sätze.

Frage: ${query}

Antwort:`;
    }
    
    const response = await axios.post('/api/gemini', {
      prompt: prompt,
      temperature: 0.1, // Reduzierte Temperatur für präzisere Antworten
      maxOutputTokens: 1024,
      model: 'gemini-2.5-pro'
    });
    
    return response.data.text;
  } catch (error) {
    console.error('Error generating hypothetical answer:', error);
    throw error;
  }
}

/**
 * Generate expanded query with domain-specific terminology
 * @param {string} query Original query
 * @param {string} collection Collection for context
 * @returns {Promise<string>} Expanded query
 */
export async function expandQueryForSearch(query, collection = 'cs30') {
  try {
    let prompt = '';
    
    if (collection === 'cs30') {
      prompt = `Als Assistent für die Energiewirtschaft und speziell für die Schleupen CS/30 Software, 
erweitere die folgende Suchanfrage mit relevanten Fachbegriffen, ohne die Bedeutung zu verändern.
Füge Schleupen-spezifische Menüpfade, Modulnamen und typische Arbeitsprozesse hinzu, die für diese Anfrage relevant sein könnten.
Formuliere keine neue Frage, sondern gib nur die erweiterte Suchanfrage zurück (maximal 200 Zeichen).

Originalanfrage: "${query}"`;
    } else {
      prompt = `Als Assistent für die Energiewirtschaft und Marktkommunikation, 
erweitere die folgende Suchanfrage mit relevanten Fachbegriffen aus der Marktkommunikation und Energiewirtschaft.
Füge relevante GPKE/GeLi/MaBiS-Prozesse, EDIFACT-Nachrichtentypen oder ähnliche Fachbegriffe hinzu, ohne die Bedeutung zu verändern.
Formuliere keine neue Frage, sondern gib nur die erweiterte Suchanfrage zurück (maximal 200 Zeichen).

Originalanfrage: "${query}"`;
    }
    
    const response = await axios.post('/api/gemini', {
      prompt: prompt,
      temperature: 0.1,
      maxOutputTokens: 512,
      model: 'gemini-2.5-pro'
    });
    
    return response.data.text;
  } catch (error) {
    console.error('Error expanding query:', error);
    // Return original query on error
    return query;
  }
}
