// Express Router für LLM API
// Erstellt: 14. August 2025  
// Beschreibung: LLM-basierte Funktionen für verschiedene Anwendungsfälle
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');
// POST /api/llm/generate-email
// LLM-basierte Email-Generierung für bilaterale Klärfälle
router.post('/generate-email', authenticateToken, async (req, res) => {
    try {
        const { clarification, requestType, language = 'de' } = req.body;
        // Validierung
        if (!clarification || !requestType) {
            return res.status(400).json({
                error: 'Klärfall-Daten und Request-Typ sind erforderlich'
            });
        }
        // Hier würde normalerweise ein LLM-Service aufgerufen werden
        // Für jetzt verwenden wir eine intelligente template-basierte Lösung
        const emailSuggestion = generateEmailTemplate(clarification, requestType, language);
        logger.info(`Email suggestion generated for clarification ${clarification.id} by user ${req.user.id}`);
        res.json(emailSuggestion);
    }
    catch (error) {
        logger.error('Error generating email suggestion:', error);
        res.status(500).json({
            error: 'Fehler bei der Email-Generierung',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// Helper function to generate email template
function generateEmailTemplate(clarification, requestType, language) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const recipientEmail = ((_a = clarification.selectedContact) === null || _a === void 0 ? void 0 : _a.contactEmail) ||
        ((_d = (_c = (_b = clarification.marketPartner) === null || _b === void 0 ? void 0 : _b.contacts) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.contactEmail) ||
        'partner@example.com';
    const contactName = ((_e = clarification.selectedContact) === null || _e === void 0 ? void 0 : _e.contactName) || 'Damen und Herren';
    const companyName = ((_f = clarification.marketPartner) === null || _f === void 0 ? void 0 : _f.companyName) || 'Marktpartner';
    const dar = ((_g = clarification.dataExchangeReference) === null || _g === void 0 ? void 0 : _g.dar) || 'N/A';
    const messageType = ((_h = clarification.dataExchangeReference) === null || _h === void 0 ? void 0 : _h.originalMessageType) || 'EDIFACT-Nachricht';
    // Helper function to get role display name
    const getRoleDisplayName = (role) => {
        const roleNames = {
            'LF': 'Lieferant',
            'VNB': 'Verteilnetzbetreiber',
            'MSB': 'Messstellenbetreiber',
            'MST': 'Messstellenbetreiber',
            'UNB': 'Übertragungsnetzbetreiber',
            'NB': 'Netzbetreiber',
            'RLM': 'Reallastmessung',
            'SLP': 'Standardlastprofil',
            'BK': 'Bilanzkreis',
            'BKV': 'Bilanzkreisverantwortlicher',
            'BIKO': 'Bilanzkoordinator',
            'MA': 'Marktakteur',
            'OTHER': 'Sonstige'
        };
        return roleNames[role] || role;
    };
    const roleDisplayName = getRoleDisplayName(clarification.selectedRole);
    const subject = `Bilaterale Klärung: ${clarification.title} (DAR: ${dar})`;
    // Problemkategorisierung für bessere Strukturierung
    const isDataIssue = clarification.description.toLowerCase().includes('daten') ||
        clarification.description.toLowerCase().includes('fehler');
    const isProcessIssue = clarification.description.toLowerCase().includes('prozess') ||
        clarification.description.toLowerCase().includes('ablauf');
    const isBillingIssue = clarification.description.toLowerCase().includes('abrechnung') ||
        clarification.description.toLowerCase().includes('rechnung');
    let problemCategory = 'allgemeine Klärung';
    if (isDataIssue)
        problemCategory = 'Datenabweichung';
    else if (isProcessIssue)
        problemCategory = 'Prozessklärung';
    else if (isBillingIssue)
        problemCategory = 'Abrechnungsklärung';
    // Intelligente Email-Generierung basierend auf Kontext
    let body = '';
    if (requestType === 'bilateral_clarification_email') {
        // Anrede anpassen basierend auf verfügbaren Kontaktdaten
        const greeting = contactName === 'Damen und Herren'
            ? 'Sehr geehrte Damen und Herren'
            : contactName.includes('Herr')
                ? `Sehr geehrter ${contactName}`
                : contactName.includes('Frau')
                    ? `Sehr geehrte ${contactName}`
                    : `Sehr geehrte Damen und Herren`;
        body = `${greeting},

wir wenden uns an Sie bezüglich einer ${problemCategory} im Rahmen der Marktkommunikation.

**Klärfall-Details:**
• Titel: ${clarification.title}
• Datenaustauschreferenz (DAR): ${dar}
• Nachrichtentyp: ${messageType}
• Betroffene Marktrolle: ${roleDisplayName}
• Erstellt am: ${new Date().toLocaleDateString('de-DE')}

**Sachverhalt:**
${clarification.description}

**Unser Anliegen:**
Wir bitten Sie um Prüfung des oben beschriebenen Sachverhalts und zeitnahe Rückmeldung bezüglich der weiteren Vorgehensweise. 

**Benötigte Informationen von Ihrer Seite:**
• Bestätigung bzw. Ihre Sicht zum beschriebenen Sachverhalt
• Geplante Korrekturmaßnahmen (falls erforderlich)
• Zeitplan für die Umsetzung eventueller Korrekturen
• Ansprechpartner für weitere Rückfragen zu diesem Fall

Für eine schnelle Klärung wären wir Ihnen sehr dankbar. Bei Rückfragen oder für eine telefonische Abstimmung stehen wir Ihnen gerne zur Verfügung.

Wir freuen uns auf Ihre baldige Rückmeldung.

Mit freundlichen Grüßen
Ihr Marktkommunikationsteam`;
    }
    const reasoning = `Email wurde intelligent basierend auf Klärfall-Details generiert:
- Anrede wurde an verfügbare Kontaktdaten angepasst
- Problemkategorie wurde automatisch erkannt: ${problemCategory}
- Strukturierung folgt deutschen Marktkommunikations-Standards
- Konkrete Handlungsaufforderungen wurden formuliert
- Professioneller, höflicher Ton wurde gewählt`;
    return {
        to: recipientEmail,
        cc: '',
        subject,
        body,
        reasoning
    };
}
module.exports = router;
//# sourceMappingURL=llm.js.map