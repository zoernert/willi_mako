"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileService = void 0;
const database_1 = __importDefault(require("../config/database"));
const gemini_1 = __importDefault(require("./gemini"));
class UserProfileService {
    constructor() {
    }
    async getUserProfile(userId) {
        try {
            const result = await database_1.default.query('SELECT user_profile FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0].user_profile || this.getDefaultProfile();
        }
        catch (error) {
            console.error('Error fetching user profile:', error);
            return this.getDefaultProfile();
        }
    }
    async updateUserProfile(userId, userMessage, aiResponse) {
        try {
            const currentProfile = await this.getUserProfile(userId);
            if (!currentProfile) {
                console.error('User profile not found for user:', userId);
                return;
            }
            const insights = await this.generateUserInsights(userMessage, aiResponse, currentProfile);
            if (insights) {
                const updatedProfile = await this.mergeProfileInsights(currentProfile, insights);
                await this.saveUserProfile(userId, updatedProfile);
                console.log('User profile updated for user:', userId);
            }
        }
        catch (error) {
            console.error('Error updating user profile:', error);
        }
    }
    async generateUserInsights(userMessage, aiResponse, currentProfile) {
        try {
            const prompt = `
Analysiere die folgende Konversation und die bestehenden Nutzerprofilinformationen, um neue Erkenntnisse über den Nutzer zu gewinnen:

AKTUELLE NUTZERPROFILINFORMATIONEN:
${JSON.stringify(currentProfile, null, 2)}

NEUE KONVERSATION:
Nutzer: ${userMessage}
Assistent: ${aiResponse}

Analysiere die Nutzernachricht und extrahiere neue Erkenntnisse über:

1. FACHLICHE EXPERTISE:
   - Welches Fachwissen zeigt der Nutzer?
   - Welche Fachbereiche sind für ihn relevant?
   - Welche Unternehmensgröße/Art scheint er zu vertreten?

2. KOMMUNIKATIONSSTIL:
   - Bevorzugt er formelle oder informelle Sprache?
   - Welche Fachbegriffe verwendet er?
   - Wie detailliert sind seine Fragen?

3. INTERESSENSSCHWERPUNKTE:
   - Welche Themen interessieren ihn?
   - Welche Problemstellungen beschäftigen ihn?
   - Welche Lösungsansätze sucht er?

4. LERNVERHALTEN:
   - Stellt er Grundlagenfragen oder Detailfragen?
   - Sucht er praktische Umsetzung oder theoretisches Wissen?
   - Baut er auf vorherigem Wissen auf?

Antworte NUR mit einem gültigen JSON-Objekt, das die NEUEN Erkenntnisse enthält. Wenn keine neuen Erkenntnisse gewonnen werden können, antworte mit null.

Beispiel-Antwortformat:
{
  "expertise_level": "intermediate",
  "communication_style": "professional",
  "preferred_terminology": ["Marktkommunikation", "Bilanzkreis"],
  "knowledge_areas": ["Energiehandel", "Regulierung"],
  "company_type": "Stadtwerke",
  "experience_topics": ["Smart Meter Gateway", "Lastgangmessung"],
  "learning_progress": {
    "completed_topics": ["Grundlagen MaKo"],
    "current_focus": "Bilanzierung"
  },
  "interaction_patterns": {
    "question_types": ["practical", "detailed"],
    "response_preferences": ["examples", "step-by-step"]
  }
}
`;
            const result = await gemini_1.default.generateResponse([{ role: 'user', content: prompt }], '', {});
            const cleanedResult = result.trim();
            if (cleanedResult === 'null' || cleanedResult.toLowerCase() === 'null') {
                return null;
            }
            try {
                const insights = JSON.parse(cleanedResult);
                return insights;
            }
            catch (parseError) {
                console.error('Error parsing insights JSON:', parseError);
                return null;
            }
        }
        catch (error) {
            console.error('Error generating user insights:', error);
            return null;
        }
    }
    async mergeProfileInsights(currentProfile, insights) {
        const mergedProfile = {
            ...currentProfile,
            last_updated: new Date().toISOString()
        };
        if (insights.expertise_level) {
            const levels = ['beginner', 'intermediate', 'advanced'];
            const currentLevel = levels.indexOf(currentProfile.expertise_level);
            const newLevel = levels.indexOf(insights.expertise_level);
            if (newLevel > currentLevel) {
                mergedProfile.expertise_level = insights.expertise_level;
            }
        }
        if (insights.communication_style) {
            mergedProfile.communication_style = insights.communication_style;
        }
        if (insights.preferred_terminology) {
            const existingTerms = new Set(currentProfile.preferred_terminology);
            insights.preferred_terminology.forEach(term => existingTerms.add(term));
            mergedProfile.preferred_terminology = Array.from(existingTerms);
        }
        if (insights.knowledge_areas) {
            const existingAreas = new Set(currentProfile.knowledge_areas);
            insights.knowledge_areas.forEach(area => existingAreas.add(area));
            mergedProfile.knowledge_areas = Array.from(existingAreas);
        }
        if (insights.company_type) {
            mergedProfile.company_type = insights.company_type;
        }
        if (insights.experience_topics) {
            const existingTopics = new Set(currentProfile.experience_topics);
            insights.experience_topics.forEach(topic => existingTopics.add(topic));
            mergedProfile.experience_topics = Array.from(existingTopics);
        }
        if (insights.learning_progress) {
            if (insights.learning_progress.completed_topics) {
                const existingCompleted = new Set(currentProfile.learning_progress.completed_topics);
                insights.learning_progress.completed_topics.forEach(topic => existingCompleted.add(topic));
                mergedProfile.learning_progress.completed_topics = Array.from(existingCompleted);
            }
            if (insights.learning_progress.current_focus) {
                mergedProfile.learning_progress.current_focus = insights.learning_progress.current_focus;
            }
        }
        if (insights.interaction_patterns) {
            if (insights.interaction_patterns.question_types) {
                const existingQuestionTypes = new Set(currentProfile.interaction_patterns.question_types);
                insights.interaction_patterns.question_types.forEach(type => existingQuestionTypes.add(type));
                mergedProfile.interaction_patterns.question_types = Array.from(existingQuestionTypes);
            }
            if (insights.interaction_patterns.response_preferences) {
                const existingResponsePrefs = new Set(currentProfile.interaction_patterns.response_preferences);
                insights.interaction_patterns.response_preferences.forEach(pref => existingResponsePrefs.add(pref));
                mergedProfile.interaction_patterns.response_preferences = Array.from(existingResponsePrefs);
            }
        }
        return mergedProfile;
    }
    async saveUserProfile(userId, profile) {
        try {
            await database_1.default.query('UPDATE users SET user_profile = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(profile), userId]);
        }
        catch (error) {
            console.error('Error saving user profile:', error);
            throw error;
        }
    }
    getDefaultProfile() {
        return {
            expertise_level: 'intermediate',
            communication_style: 'professional',
            preferred_terminology: [],
            knowledge_areas: [],
            company_type: '',
            experience_topics: [],
            learning_progress: {
                completed_topics: [],
                current_focus: ''
            },
            interaction_patterns: {
                question_types: [],
                response_preferences: []
            },
            last_updated: new Date().toISOString()
        };
    }
    async getUserProfileContext(userId) {
        try {
            const profile = await this.getUserProfile(userId);
            if (!profile)
                return '';
            const contextParts = [];
            if (profile.expertise_level) {
                contextParts.push(`Expertise-Level: ${profile.expertise_level}`);
            }
            if (profile.communication_style) {
                contextParts.push(`Kommunikationsstil: ${profile.communication_style}`);
            }
            if (profile.preferred_terminology.length > 0) {
                contextParts.push(`Bevorzugte Begriffe: ${profile.preferred_terminology.join(', ')}`);
            }
            if (profile.knowledge_areas.length > 0) {
                contextParts.push(`Wissensgebiete: ${profile.knowledge_areas.join(', ')}`);
            }
            if (profile.company_type) {
                contextParts.push(`Unternehmenstyp: ${profile.company_type}`);
            }
            if (profile.experience_topics.length > 0) {
                contextParts.push(`Erfahrene Themen: ${profile.experience_topics.join(', ')}`);
            }
            if (profile.learning_progress.current_focus) {
                contextParts.push(`Aktueller Fokus: ${profile.learning_progress.current_focus}`);
            }
            if (profile.interaction_patterns.question_types.length > 0) {
                contextParts.push(`Fragetypen: ${profile.interaction_patterns.question_types.join(', ')}`);
            }
            if (profile.interaction_patterns.response_preferences.length > 0) {
                contextParts.push(`Antwortpräferenzen: ${profile.interaction_patterns.response_preferences.join(', ')}`);
            }
            return contextParts.length > 0 ?
                `NUTZERPROFILINFORMATIONEN:\n${contextParts.join('\n')}\n\n` :
                '';
        }
        catch (error) {
            console.error('Error generating user profile context:', error);
            return '';
        }
    }
}
exports.UserProfileService = UserProfileService;
exports.default = UserProfileService;
//# sourceMappingURL=userProfile.js.map