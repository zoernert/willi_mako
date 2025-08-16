"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const generative_ai_1 = require("@google/generative-ai");
const pg_1 = require("pg");
const router = express_1.default.Router();
// Multer konfigurieren für Datei-Upload
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    },
});
class ScreenshotAnalysisService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    /**
     * Analysiert ein Screenshot-Bild und extrahiert Energiewirtschafts-Codes
     */
    async analyzeScreenshot(imageBuffer, mimeType) {
        try {
            // Bild für LLM vorbereiten
            const imagePart = {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType,
                },
            };
            // Prompt für die Code-Extraktion erstellen
            const prompt = this.buildExtractionPrompt();
            // LLM-Analyse durchführen
            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const extractedData = this.parseExtractionResponse(response.text());
            // Für BDEW-Codes zusätzliche Informationen aus der Datenbank laden
            if (extractedData.codes.some(code => code.type === 'BDEW')) {
                const bdewCodes = extractedData.codes.filter(code => code.type === 'BDEW');
                const bdewInfo = await this.getBDEWPartnerInfo(bdewCodes[0].value);
                if (bdewInfo) {
                    extractedData.bdewPartnerInfo = bdewInfo;
                }
            }
            return extractedData;
        }
        catch (error) {
            console.error('Fehler bei der Screenshot-Analyse:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            throw new Error(`Screenshot-Analyse fehlgeschlagen: ${errorMessage}`);
        }
    }
    /**
     * Erstellt den Prompt für die Code-Extraktion
     */
    buildExtractionPrompt() {
        return `
Du bist ein Experte für die Analyse von Screenshots und Dokumenten im Energiesektor. 
Analysiere das Bild und extrahiere folgende Informationen:

AUFGABEN:
1. **Code-Identifikation (SEHR WICHTIG):**
   - MaLo (Marktlokations-ID): 11-stellige Zahl (z.B. 12345678901)
   - MeLo (Messlokations-ID): 33-stellige alphanumerische ID (beginnt oft mit DE)
   - EIC-Code: 16-stellige alphanumerische ID (Energy Identification Code)
   - BDEW Code-Nummer: 13-stellige Zahl für Marktpartner-Identifikation

2. **Strukturinformationen:**
   - Namen von Personen oder Unternehmen
   - Adressen (Straße, PLZ, Ort)
   - E-Mail-Adressen
   - Telefonnummern

3. **Kontext-Analyse:**
   - Erkenne den Kontext jedes gefundenen Codes
   - Bewerte die Konfidenz der Erkennung (0.0 bis 1.0)

WICHTIGE HINWEISE:
- Achte besonders auf die korrekte Länge der Codes
- MaLo = exakt 11 Ziffern
- MeLo = exakt 33 Zeichen (meist alphanumerisch)
- EIC = exakt 16 Zeichen (alphanumerisch)
- BDEW = exakt 13 Ziffern
- Verwende hohe Konfidenz nur bei eindeutiger Erkennung

Antworte ausschließlich im folgenden JSON-Format (ohne zusätzliche Formatierung):
{
  "codes": [
    {
      "type": "MaLo|MeLo|EIC|BDEW",
      "value": "erkannter_code",
      "confidence": 0.95,
      "context": "Beschreibung wo der Code gefunden wurde"
    }
  ],
  "additionalInfo": {
    "name": "erkannter Name",
    "address": "erkannte Straße und Hausnummer",
    "city": "erkannte Stadt",
    "postalCode": "erkannte PLZ",
    "email": "erkannte@email.de",
    "phone": "erkannte Telefonnummer"
  },
  "rawText": "Der gesamte erkannte Text aus dem Bild"
}

Führe jetzt die Analyse durch:`;
    }
    /**
     * Parst die LLM-Antwort und extrahiert strukturierte Daten
     */
    parseExtractionResponse(responseText) {
        try {
            // JSON aus der Antwort extrahieren
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Keine gültige JSON-Antwort vom LLM erhalten');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            // Codes validieren und filtern
            const validatedCodes = (parsed.codes || [])
                .filter((code) => this.validateCode(code))
                .map((code) => ({
                type: code.type,
                value: code.value,
                confidence: Math.min(Math.max(code.confidence || 0, 0), 1),
                context: code.context || '',
            }));
            return {
                codes: validatedCodes,
                additionalInfo: parsed.additionalInfo || {},
                rawText: parsed.rawText || '',
            };
        }
        catch (error) {
            console.error('Fehler beim Parsen der LLM-Antwort:', error);
            // Fallback: Versuche mindestens den Text zu extrahieren
            return {
                codes: [],
                additionalInfo: {},
                rawText: responseText,
            };
        }
    }
    /**
     * Validiert einen extrahierten Code basierend auf seiner Länge und Format
     */
    validateCode(code) {
        if (!code.type || !code.value)
            return false;
        const value = code.value.toString().replace(/\s/g, ''); // Leerzeichen entfernen
        switch (code.type) {
            case 'MaLo':
                return /^\d{11}$/.test(value);
            case 'MeLo':
                return /^[A-Z0-9]{33}$/.test(value);
            case 'EIC':
                return /^[A-Z0-9]{16}$/.test(value);
            case 'BDEW':
                return /^\d{13}$/.test(value);
            default:
                return false;
        }
    }
    /**
     * Lädt zusätzliche Informationen für einen BDEW-Code aus der Datenbank
     */
    async getBDEWPartnerInfo(bdewCode) {
        try {
            const query = `
        SELECT 
          company_name as name,
          street as address,
          city,
          postal_code,
          contact_person as contact,
          website
        FROM bdew_codes 
        WHERE code_number = $1
        LIMIT 1
      `;
            const result = await this.pool.query(query, [bdewCode]);
            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    name: row.name,
                    address: row.address,
                    city: row.city,
                    postalCode: row.postal_code,
                    contact: row.contact,
                    website: row.website,
                };
            }
            return null;
        }
        catch (error) {
            console.error('Fehler beim Laden der BDEW-Partner-Info:', error);
            return null;
        }
    }
}
// Route für Screenshot-Analyse (keine Authentifikation erforderlich)
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Keine Bilddatei übertragen' });
        }
        // Screenshot-Analyse-Service initialisieren
        const analysisService = new ScreenshotAnalysisService();
        // Screenshot analysieren
        const result = await analysisService.analyzeScreenshot(file.buffer, file.mimetype);
        // Ergebnis zurückgeben
        res.status(200).json(result);
    }
    catch (error) {
        console.error('API-Fehler:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        // Spezielle Behandlung für fehlende API-Keys
        if (errorMessage.includes('GEMINI_API_KEY')) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                details: 'Die Screenshot-Analyse ist derzeit nicht verfügbar. Bitte wenden Sie sich an den Administrator.',
                technical: 'Gemini API-Key nicht konfiguriert'
            });
        }
        res.status(500).json({
            error: 'Interner Server-Fehler',
            details: errorMessage
        });
    }
});
exports.default = router;
//# sourceMappingURL=screenshot-analysis.js.map