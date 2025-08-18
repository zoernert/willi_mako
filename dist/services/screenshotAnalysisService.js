/**
 * Screenshot Analysis Service
 * Analyzes uploaded screenshots to detect UI elements, errors, and application context
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

interface ScreenshotAnalysis {
  detectedElements: DetectedElement[];
  errorMessages: string[];
  uiComponents: UIComponent[];
  confidence: number;
  isSchleupnCS30: boolean;
  extractedText: string;
  analysis: string;
}

interface DetectedElement {
  type: 'error' | 'warning' | 'dialog' | 'menu' | 'form' | 'button' | 'table';
  text: string;
  confidence: number;
  position?: { x: number; y: number; width: number; height: number };
}

interface UIComponent {
  name: string;
  visible: boolean;
  text?: string;
}

class ScreenshotAnalysisService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API Key is required for screenshot analysis');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent analysis
        maxOutputTokens: 2048,
      }
    });
  }

  /**
   * Analyze a screenshot to extract information and detect UI elements
   */
  async analyzeScreenshot(imagePath: string): Promise<ScreenshotAnalysis> {
    try {
      // Process image for better analysis
      const processedImagePath = await this.preprocessImage(imagePath);
      
      // Read processed image
      const imageData = await fs.readFile(processedImagePath);
      const imageBase64 = imageData.toString('base64');

      // Create the analysis prompt
      const prompt = this.createAnalysisPrompt();

      // Analyze with Gemini Vision
      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: "image/png",
            data: imageBase64
          }
        },
        { text: prompt }
      ]);

      const response = await result.response;
      const analysisText = response.text();

      // Parse the structured response
      const analysis = this.parseAnalysisResponse(analysisText);

      // Clean up processed image
      if (processedImagePath !== imagePath) {
        await fs.unlink(processedImagePath).catch(() => {}); // Ignore errors
      }

      return analysis;

    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      throw new Error('Screenshot analysis failed');
    }
  }

  /**
   * Preprocess image for better OCR and analysis results
   */
  private async preprocessImage(imagePath: string): Promise<string> {
    try {
      const outputPath = imagePath.replace(/\.(jpg|jpeg|png|webp)$/i, '_processed.png');
      
      await sharp(imagePath)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90 })
        .sharpen()
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  /**
   * Create comprehensive analysis prompt for Gemini Vision
   */
  private createAnalysisPrompt(): string {
    return `
Analyze this screenshot systematically and provide a detailed JSON response with the following structure:

{
  "extractedText": "All visible text in the image",
  "isSchleupnCS30": boolean (true if this appears to be Schleupen CS 3.0 software interface),
  "errorMessages": ["array of any error messages or alerts visible"],
  "detectedElements": [
    {
      "type": "error|warning|dialog|menu|form|button|table",
      "text": "text content of the element",
      "confidence": 0.0-1.0,
      "position": {"x": 0, "y": 0, "width": 0, "height": 0}
    }
  ],
  "uiComponents": [
    {
      "name": "component name (e.g., 'Menu Bar', 'Dialog', 'Data Grid')",
      "visible": true|false,
      "text": "any text content"
    }
  ],
  "confidence": 0.0-1.0 (overall analysis confidence),
  "analysis": "Detailed description of what is shown in the screenshot, including any problems or notable elements"
}

ANALYSIS INSTRUCTIONS:
1. Look carefully for any error messages, warnings, or dialog boxes
2. Identify if this is a Schleupen CS 3.0 interface (look for specific UI patterns, logos, or German energy utility software characteristics)
3. Extract all visible text accurately
4. Identify UI components like menus, forms, tables, buttons
5. Pay special attention to any error states, warning icons, or problem indicators
6. Provide position coordinates for important elements if possible
7. Rate your confidence in the analysis

Focus especially on:
- Error messages or warning dialogs
- Application crashes or freezes
- Data validation errors
- Network connection issues
- Missing or corrupted data displays
- UI elements that appear broken or misaligned

Respond ONLY with valid JSON, no additional text.
`;
  }

  /**
   * Parse the AI response into structured analysis
   */
  private parseAnalysisResponse(responseText: string): ScreenshotAnalysis {
    try {
      // Clean the response text
      let cleanText = responseText.trim();
      
      // Remove any markdown code blocks
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanText);

      // Validate and normalize the response
      return {
        extractedText: parsed.extractedText || '',
        isSchleupnCS30: Boolean(parsed.isSchleupnCS30),
        errorMessages: Array.isArray(parsed.errorMessages) ? parsed.errorMessages : [],
        detectedElements: Array.isArray(parsed.detectedElements) ? parsed.detectedElements.map(el => ({
          type: el.type || 'unknown',
          text: el.text || '',
          confidence: Math.max(0, Math.min(1, Number(el.confidence) || 0)),
          position: el.position || undefined
        })) : [],
        uiComponents: Array.isArray(parsed.uiComponents) ? parsed.uiComponents.map(comp => ({
          name: comp.name || '',
          visible: Boolean(comp.visible),
          text: comp.text || undefined
        })) : [],
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
        analysis: parsed.analysis || 'Analysis could not be completed'
      };

    } catch (error) {
      console.error('Error parsing analysis response:', error);
      console.error('Raw response:', responseText);
      
      // Return fallback analysis
      return {
        extractedText: 'Text extraction failed',
        isSchleupnCS30: false,
        errorMessages: [],
        detectedElements: [],
        uiComponents: [],
        confidence: 0.1,
        analysis: 'Screenshot analysis failed to parse properly'
      };
    }
  }

  /**
   * Generate enhanced prompt for chat based on screenshot analysis
   */
  generateContextPrompt(userMessage: string, analysis: ScreenshotAnalysis): string {
    let contextPrompt = `\n\n--- SCREENSHOT ANALYSIS CONTEXT ---\n`;
    
    if (analysis.isSchleupnCS30) {
      contextPrompt += `🏢 APPLICATION: Schleupen CS 3.0 (Energy Utility Software)\n`;
    }
    
    contextPrompt += `📊 ANALYSIS CONFIDENCE: ${Math.round(analysis.confidence * 100)}%\n`;
    
    if (analysis.errorMessages.length > 0) {
      contextPrompt += `🚨 ERROR MESSAGES DETECTED:\n`;
      analysis.errorMessages.forEach((error, index) => {
        contextPrompt += `   ${index + 1}. ${error}\n`;
      });
    }
    
    if (analysis.detectedElements.length > 0) {
      contextPrompt += `🔍 UI ELEMENTS DETECTED:\n`;
      analysis.detectedElements.forEach((element, index) => {
        contextPrompt += `   ${index + 1}. ${element.type.toUpperCase()}: ${element.text} (${Math.round(element.confidence * 100)}%)\n`;
      });
    }
    
    if (analysis.extractedText.length > 0) {
      contextPrompt += `📝 EXTRACTED TEXT:\n${analysis.extractedText}\n`;
    }
    
    contextPrompt += `📋 ANALYSIS SUMMARY:\n${analysis.analysis}\n`;
    contextPrompt += `--- END SCREENSHOT CONTEXT ---\n\n`;
    
    contextPrompt += `User's question about this screenshot: ${userMessage}\n\n`;
    contextPrompt += `Please analyze the screenshot content in relation to the user's question. `;
    contextPrompt += `Focus especially on any error messages or problems visible in the interface. `;
    
    if (analysis.isSchleupnCS30) {
      contextPrompt += `This appears to be Schleupen CS 3.0 software, so provide energy utility industry-specific guidance. `;
    }
    
    contextPrompt += `Provide specific, actionable solutions based on what you can see in the screenshot.`;
    
    return contextPrompt;
  }

  /**
   * Save screenshot file with proper naming and organization
   */
  async saveScreenshot(file: Express.Multer.File, chatId: string, messageId: string): Promise<string> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'screenshots');
      await fs.mkdir(uploadsDir, { recursive: true });

      const timestamp = Date.now();
      const extension = path.extname(file.originalname) || '.png';
      const filename = `${chatId}_${messageId}_${timestamp}${extension}`;
      const filepath = path.join(uploadsDir, filename);

      await fs.writeFile(filepath, file.buffer);

      // Return relative URL for frontend access
      return `/uploads/screenshots/${filename}`;
    } catch (error) {
      console.error('Error saving screenshot:', error);
      throw new Error('Failed to save screenshot');
    }
  }
}

export default new ScreenshotAnalysisService();
