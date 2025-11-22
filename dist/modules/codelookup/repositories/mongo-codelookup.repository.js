"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoCodeLookupRepository = void 0;
const mongodb_1 = require("mongodb");
const market_role_util_1 = require("../utils/market-role.util");
class MongoCodeLookupRepository {
    constructor() {
        this.db = null;
        this.collection = null;
        this.client = null;
        this.initializeConnection();
    }
    async initializeConnection() {
        try {
            const mongoUri = process.env.MONGO_URI;
            if (!mongoUri) {
                throw new Error('MONGO_URI environment variable is not set');
            }
            this.client = new mongodb_1.MongoClient(mongoUri);
            await this.client.connect();
            this.db = this.client.db('quitus');
            this.collection = this.db.collection('discovery_results');
            console.log('MongoDB connection initialized successfully');
        }
        catch (error) {
            console.error('MongoDB connection failed:', error);
            throw error;
        }
    }
    async ensureConnection() {
        if (!this.collection || !this.db) {
            await this.initializeConnection();
        }
    }
    transformDocumentToResult(doc) {
        const partner = doc.partner || {};
        const idString = (doc._id && typeof doc._id.toString === 'function') ? doc._id.toString() : doc._id || '';
        // Sammle alle Software-Systeme aus allen Findings
        const allSoftwareSystems = [];
        if (doc.findings) {
            doc.findings.forEach((finding) => {
                if (finding.software_systems) {
                    allSoftwareSystems.push(...finding.software_systems);
                }
            });
        }
        // Kontakte sammeln (neues Schema: contacts oder abgeleitet aus partner Feldern)
        const contacts = [];
        if (doc.contacts && Array.isArray(doc.contacts)) {
            contacts.push(...doc.contacts);
        }
        else if (partner.CompanyUID || partner.CodeContact) {
            contacts.push({
                BdewCodeType: partner.BdewCodeType,
                BdewCodeFunction: partner.BdewCodeFunction,
                BdewCodeStatus: partner.BdewCodeStatus,
                BdewCodeStatusBegin: partner.BdewCodeStatusBegin,
                CompanyUID: partner.CompanyUID,
                PostCode: partner.PostCode,
                City: partner.City,
                Street: partner.Street,
                Country: partner.Country,
                CodeContact: partner.CodeContact,
                CodeContactPhone: partner.CodeContactPhone,
                CodeContactEmail: partner.CodeContactEmail,
                EditedOn: partner.EditedOn
            });
        }
        // Alle BDEW Codes aggregieren
        const bdewCodes = [];
        if (doc.bdewCodes && Array.isArray(doc.bdewCodes)) {
            bdewCodes.push(...doc.bdewCodes.filter(Boolean));
        }
        // BDEW-Codes aus dem neuen contacts Array extrahieren
        if (contacts && Array.isArray(contacts)) {
            contacts.forEach(contact => {
                if (contact.BdewCode && !bdewCodes.includes(contact.BdewCode)) {
                    bdewCodes.push(contact.BdewCode);
                }
            });
        }
        // Partner Code hinzufügen falls vorhanden und noch nicht enthalten (Legacy-Support)
        const rawPartnerCode = partner['\uFEFFBdewCode'] || partner['﻿BdewCode'] || partner.BdewCode;
        if (rawPartnerCode && !bdewCodes.includes(rawPartnerCode)) {
            bdewCodes.push(rawPartnerCode);
        }
        // Fallbacks für unterschiedliche Schemata
        const bdewCode = rawPartnerCode; // bereits oben ermittelt
        const companyName = partner.CompanyName || doc.companyName || partner.Name || '';
        const codeValue = bdewCode || (partner.EICCode ? partner.EICCode : (idString ? `mp:${idString}` : companyName || 'unbekannt'));
        return {
            code: bdewCodes[0] || '',
            companyName: doc.companyName || partner.CompanyName || '',
            codeType: (partner.BdewCodeType || 'BDEW Code'),
            validFrom: partner.BdewCodeStatusBegin || '',
            validTo: '',
            source: 'bdew',
            contacts: contacts,
            bdewCodes: bdewCodes,
            contactSheetUrl: doc.contactSheetUrl || '',
            markdown: doc.markdown || '',
            allSoftwareSystems: allSoftwareSystems,
        };
    }
    buildSearchQuery(query, filters) {
        const searchConditions = [];
        if (query && query.trim()) {
            const searchRegex = new RegExp(query.trim(), 'i');
            searchConditions.push({
                $or: [
                    // Partner (Legacy BDEW)
                    { 'partner.\uFEFFBdewCode': searchRegex },
                    { 'partner.﻿BdewCode': searchRegex },
                    { 'partner.BdewCode': searchRegex },
                    { 'partner.CompanyName': searchRegex },
                    { 'partner.City': searchRegex },
                    { 'partner.PostCode': searchRegex },
                    { 'partner.CodeContact': searchRegex },
                    { 'partner.BdewCodeFunction': searchRegex },
                    { 'partner.CompanyUID': searchRegex },
                    { 'partner.CodeContactEmail': searchRegex },
                    { 'partner.CodeContactPhone': searchRegex },
                    // Neues Schema Felder
                    { 'companyName': searchRegex },
                    { 'bdewCodes': searchRegex },
                    { 'contacts.BdewCode': searchRegex },
                    { 'contacts.BdewCodeFunction': searchRegex },
                    { 'contacts.CompanyUID': searchRegex },
                    { 'contacts.CodeContact': searchRegex },
                    { 'contacts.CodeContactEmail': searchRegex },
                    { 'contacts.CodeContactPhone': searchRegex },
                    { 'contacts.PostCode': searchRegex },
                    { 'contacts.City': searchRegex },
                    { 'contacts.Street': searchRegex },
                    { 'contacts.Country': searchRegex },
                    // Findings / Software Systeme
                    { 'findings.software_systems.name': searchRegex },
                    { 'findings.software_systems.evidence_text': searchRegex },
                    { 'findings.source_url': searchRegex }
                ]
            });
        }
        // Filter anwenden
        if (filters) {
            if (filters.softwareSystems && filters.softwareSystems.length > 0) {
                searchConditions.push({
                    'findings.software_systems.name': {
                        $in: filters.softwareSystems.map(name => new RegExp(name, 'i'))
                    }
                });
            }
            if (filters.postCode) {
                searchConditions.push({
                    'partner.PostCode': new RegExp(filters.postCode, 'i')
                });
            }
            if (filters.city) {
                searchConditions.push({
                    'partner.City': new RegExp(filters.city, 'i')
                });
            }
            if (filters.codeFunction) {
                searchConditions.push({
                    'partner.BdewCodeFunction': new RegExp(filters.codeFunction, 'i')
                });
            }
            if (filters.marketRole) {
                const roleRegex = (0, market_role_util_1.buildMarketRoleRegex)(filters.marketRole);
                if (roleRegex) {
                    searchConditions.push({
                        $or: [
                            { 'partner.BdewCodeFunction': roleRegex },
                            { 'contacts.BdewCodeFunction': roleRegex }
                        ]
                    });
                }
            }
            if (filters.confidence && filters.confidence.length > 0) {
                searchConditions.push({
                    'findings.software_systems.confidence': { $in: filters.confidence }
                });
            }
        }
        return searchConditions.length > 0 ? { $and: searchConditions } : {};
    }
    async searchCodes(query, filters) {
        try {
            await this.ensureConnection();
            if (!this.collection)
                throw new Error('MongoDB collection not available');
            const searchQuery = this.buildSearchQuery(query, filters);
            const docs = await this.collection
                .find(searchQuery)
                .limit(50)
                .toArray();
            const results = docs.map(doc => this.transformDocumentToResult(doc));
            // Sortiere nach Relevanz
            return this.sortByRelevance(results, query);
        }
        catch (error) {
            console.error('Error searching codes in MongoDB:', error);
            throw new Error('Failed to search codes');
        }
    }
    async searchBDEWCodes(query, filters) {
        // Für MongoDB sind alle Codes BDEW-Codes, daher gleiche Implementierung
        return this.searchCodes(query, filters);
    }
    async searchEICCodes(query, filters) {
        // MongoDB enthält primär BDEW-Codes, EIC-Codes würden separat behandelt
        // Für jetzt geben wir leeres Array zurück
        return [];
    }
    async getCodeDetails(code) {
        try {
            await this.ensureConnection();
            if (!this.collection)
                throw new Error('MongoDB collection not available');
            let doc = null;
            // 1) Wenn synthetischer Code mp:<id>
            if (code.startsWith('mp:')) {
                const idStr = code.slice(3);
                if (mongodb_1.ObjectId.isValid(idStr)) {
                    // Cast filter to any to satisfy generic _id typing differences
                    doc = await this.collection.findOne({ _id: new mongodb_1.ObjectId(idStr) });
                }
            }
            // 2) Direkter Versuch über _id (falls UI nur die ID sendet)
            if (!doc && mongodb_1.ObjectId.isValid(code)) {
                doc = await this.collection.findOne({ _id: new mongodb_1.ObjectId(code) });
            }
            // 3) Suche über BDEW-Code-Felder
            if (!doc) {
                doc = await this.collection.findOne({
                    $or: [
                        { 'partner.\uFEFFBdewCode': code },
                        { 'partner.﻿BdewCode': code },
                        { 'partner.BdewCode': code }
                    ]
                });
            }
            // 4) Fallback: exakter Firmenname
            if (!doc) {
                doc = await this.collection.findOne({ companyName: code });
            }
            if (!doc) {
                return null;
            }
            const baseResult = this.transformDocumentToResult(doc);
            const contacts = doc.contacts || baseResult.contacts || [];
            const bdewCodes = doc.bdewCodes || baseResult.bdewCodes || [];
            return {
                ...baseResult,
                findings: doc.findings || [],
                allSoftwareSystems: baseResult.softwareSystems || [],
                contacts,
                bdewCodes
            };
        }
        catch (error) {
            console.error('Error getting code details:', error);
            throw new Error('Failed to get code details');
        }
    }
    async getAvailableSoftwareSystems() {
        try {
            await this.ensureConnection();
            if (!this.collection)
                throw new Error('MongoDB collection not available');
            const pipeline = [
                { $unwind: '$findings' },
                { $unwind: '$findings.software_systems' },
                { $group: { _id: '$findings.software_systems.name' } },
                { $sort: { _id: 1 } }
            ];
            const result = await this.collection.aggregate(pipeline).toArray();
            return result.map(item => item._id).filter(Boolean);
        }
        catch (error) {
            console.error('Error getting software systems:', error);
            return [];
        }
    }
    async getAvailableCities() {
        try {
            await this.ensureConnection();
            if (!this.collection)
                throw new Error('MongoDB collection not available');
            const result = await this.collection.distinct('partner.City');
            return result.filter(Boolean).sort();
        }
        catch (error) {
            console.error('Error getting cities:', error);
            return [];
        }
    }
    async getAvailableCodeFunctions() {
        try {
            await this.ensureConnection();
            if (!this.collection)
                throw new Error('MongoDB collection not available');
            const result = await this.collection.distinct('partner.BdewCodeFunction');
            return result.filter(Boolean).sort();
        }
        catch (error) {
            console.error('Error getting code functions:', error);
            return [];
        }
    }
    sortByRelevance(results, query) {
        const queryLower = query.toLowerCase();
        return results.sort((a, b) => {
            // Exakte Code-Übereinstimmung hat höchste Priorität
            const aCodeExact = a.code.toLowerCase() === queryLower ? 0 : 1;
            const bCodeExact = b.code.toLowerCase() === queryLower ? 0 : 1;
            if (aCodeExact !== bCodeExact) {
                return aCodeExact - bCodeExact;
            }
            // Code beginnt mit Query
            const aCodeStarts = a.code.toLowerCase().startsWith(queryLower) ? 0 : 1;
            const bCodeStarts = b.code.toLowerCase().startsWith(queryLower) ? 0 : 1;
            if (aCodeStarts !== bCodeStarts) {
                return aCodeStarts - bCodeStarts;
            }
            // Unternehmensname beginnt mit Query
            const aNameStarts = a.companyName.toLowerCase().startsWith(queryLower) ? 0 : 1;
            const bNameStarts = b.companyName.toLowerCase().startsWith(queryLower) ? 0 : 1;
            if (aNameStarts !== bNameStarts) {
                return aNameStarts - bNameStarts;
            }
            // Alphabetisch nach Unternehmensname
            return a.companyName.localeCompare(b.companyName);
        });
    }
}
exports.MongoCodeLookupRepository = MongoCodeLookupRepository;
//# sourceMappingURL=mongo-codelookup.repository.js.map