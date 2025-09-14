"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const consultations_1 = require("../lib/content/consultations");
const ConsultationExportService_1 = require("../services/ConsultationExportService");
const GithubIssuesService_1 = require("../services/GithubIssuesService");
const ConsultationAIService_1 = require("../services/ConsultationAIService");
const ConsultationSearchService_1 = require("../services/ConsultationSearchService");
const mongoRepository_1 = require("../modules/consultationSubmissions/mongoRepository");
const CommunityService_1 = require("../services/CommunityService");
const database_1 = __importDefault(require("../config/database"));
const CommunityPublicationRepository_1 = require("../repositories/CommunityPublicationRepository");
const router = express_1.default.Router();
const readLimiter = (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 60 });
const exportLimiter = (0, express_rate_limit_1.default)({ windowMs: 5 * 60 * 1000, max: 20 });
const responseLimiter = (0, express_rate_limit_1.default)({ windowMs: 5 * 60 * 1000, max: 30 });
const aiLimiter = (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 20 });
const searchLimiter = (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 30 });
const submitLimiter = (0, express_rate_limit_1.default)({ windowMs: 10 * 60 * 1000, max: 10 });
router.use(readLimiter);
// Published Community Threads (read-only snapshots)
router.get('/threads/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const svc = new CommunityService_1.CommunityService(database_1.default);
        const publication = await svc.getPublicationBySlug(slug);
        if (!publication)
            return res.status(404).json({ success: false, message: 'Not found' });
        // Minimal public payload plus link back to private thread
        const data = {
            slug: publication.slug,
            title: publication.title,
            summary: publication.summary,
            thread_id: publication.thread_id,
            published_at: publication.published_at,
            source_thread_updated_at: publication.source_thread_updated_at,
            content: publication.published_content,
            // Legacy app path for authenticated detail view
            privateThreadUrl: `/app/community/${publication.thread_id}`,
        };
        // Dynamic content that can change on re-publish: disable caching to avoid stale 404s
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ success: true, data });
    }
    catch (e) {
        console.error('Public thread fetch failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to fetch publication' });
    }
});
// List all published community thread slugs (for sitemap and simple listings)
router.get('/threads', async (req, res) => {
    try {
        const repo = new CommunityPublicationRepository_1.CommunityPublicationRepository(database_1.default);
        const items = await repo.listAllPublic();
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
        return res.json({ success: true, data: items });
    }
    catch (e) {
        console.error('Public threads list failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to list publications' });
    }
});
// GET /api/public/community/consultations/:slug
router.get('/consultations/:slug', (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload) {
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    }
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.json({ success: true, data: payload });
});
// Exports
router.get('/consultations/:slug/export.pdf', exportLimiter, async (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const issues = await GithubIssuesService_1.GithubIssuesService.getIssues(false, slug);
        const pdf = await ConsultationExportService_1.ConsultationExportService.exportPDF(payload, issues);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
        res.setHeader('Content-Disposition', `attachment; filename="${slug}.pdf"`);
        res.send(pdf);
    }
    catch (e) {
        console.error('Export PDF failed:', e);
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
});
router.get('/consultations/:slug/export.docx', exportLimiter, async (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const issues = await GithubIssuesService_1.GithubIssuesService.getIssues(false, slug);
        const docx = await ConsultationExportService_1.ConsultationExportService.exportDOCX(payload, issues);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
        res.setHeader('Content-Disposition', `attachment; filename="${slug}.docx"`);
        res.send(docx);
    }
    catch (e) {
        console.error('Export DOCX failed:', e);
        res.status(500).json({ success: false, message: 'Failed to generate DOCX' });
    }
});
// AI: Summaries per chapter (read-only)
router.get('/consultations/:slug/ai/summaries', aiLimiter, async (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const summaries = await ConsultationAIService_1.ConsultationAIService.summarizeChapters(payload);
        res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
        return res.json({ success: true, data: summaries });
    }
    catch (e) {
        console.error('AI summaries failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to generate summaries' });
    }
});
// AI: Suggest response text for general and chapter 9
router.post('/consultations/:slug/ai/suggest-response', aiLimiter, async (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const body = (req.body || {});
        let selectedIssues = [];
        if (Array.isArray(body.selectedIssueNumbers)) {
            const all = await GithubIssuesService_1.GithubIssuesService.getIssues(false, slug);
            const set = new Set(body.selectedIssueNumbers);
            selectedIssues = all.filter((i) => set.has(i.number));
        }
        const result = await ConsultationAIService_1.ConsultationAIService.suggestResponse(payload, selectedIssues, {
            role: body.role,
            positionGeneral: body.positionGeneral,
            tone: body.tone,
            chapterKeys: body.chapterKeys,
            selectedIssues,
        });
        return res.json({ success: true, data: result });
    }
    catch (e) {
        console.error('AI suggest-response failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to generate response suggestion' });
    }
});
exports.default = router;
// Issues endpoint after default export (Express tolerates order here in module scope)
router.get('/consultations/:slug/issues', readLimiter, async (req, res) => {
    const { slug } = req.params;
    try {
        const { chapterKey } = req.query;
        const issues = chapterKey
            ? await GithubIssuesService_1.GithubIssuesService.getIssuesByChapter(chapterKey, slug)
            : await GithubIssuesService_1.GithubIssuesService.getIssues(false, slug);
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
        return res.json({ success: true, data: issues });
    }
    catch (e) {
        console.error('Public issues fetch failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to fetch issues' });
    }
});
// Build a minimal response DOCX to help busy users contribute via official email
router.post('/consultations/:slug/response.docx', responseLimiter, async (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const body = (req.body || {});
        let selectedIssues = [];
        if (Array.isArray(body.selectedIssueNumbers)) {
            const all = await GithubIssuesService_1.GithubIssuesService.getIssues(false, slug);
            const set = new Set(body.selectedIssueNumbers);
            selectedIssues = all.filter((i) => set.has(i.number));
        }
        const input = {
            organization: body.organization || '',
            contact: body.contact || '',
            role: body.role || '',
            positionGeneral: body.positionGeneral || 'neutral',
            remarksGeneral: body.remarksGeneral || '',
            remarksChapter9: body.remarksChapter9 || '',
            selectedIssues,
        };
        const buf = await ConsultationExportService_1.ConsultationExportService.exportResponseDOCX(slug, input);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${slug}-rueckmeldung.docx"`);
        res.setHeader('Cache-Control', 'no-store');
        res.send(buf);
    }
    catch (e) {
        console.error('Response DOCX build failed:', e);
        res.status(500).json({ success: false, message: 'Failed to generate response DOCX' });
    }
});
// Read-only: Query contextual snippets from Qdrant for this consultation
router.get('/consultations/:slug/search', searchLimiter, async (req, res) => {
    const { slug } = req.params;
    const q = req.query.q || '';
    if (!q.trim())
        return res.status(400).json({ success: false, message: 'Missing query parameter q' });
    try {
        const svc = new ConsultationSearchService_1.ConsultationSearchService();
        const hits = await svc.search(slug, q, Math.min(5, Number(req.query.k || 3)));
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
        return res.json({ success: true, data: hits });
    }
    catch (e) {
        console.error('Consultation search failed:', e);
        return res.status(500).json({ success: false, message: 'Search failed' });
    }
});
// Submit a chapter-specific comment (stored internally; publication curated)
router.post('/consultations/:slug/submit', submitLimiter, async (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const body = (req.body || {});
        const chapterKey = (body.chapterKey || '').trim();
        const comment = (body.comment || '').trim();
        if (!chapterKey)
            return res.status(400).json({ success: false, message: 'Missing chapterKey' });
        if (!comment)
            return res.status(400).json({ success: false, message: 'Missing comment' });
        const repo = new mongoRepository_1.ConsultationSubmissionsRepository();
        const created = await repo.create({
            slug,
            chapterKey,
            author: (body.author || '').trim() || undefined,
            organization: (body.organization || '').trim() || undefined,
            contact: (body.contact || '').trim() || undefined,
            comment,
        });
        // Only return a minimal acknowledgment and a local permalink to a public page once published
        return res.json({ success: true, data: { id: String(created._id), permalink: `/konsultation/${slug}/rueckmeldung/${String(created._id)}`, status: created.status } });
    }
    catch (e) {
        console.error('Submit consultation comment failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to submit comment' });
    }
});
// Public: list published submissions for a consultation (optionally by chapter)
router.get('/consultations/:slug/submissions', readLimiter, async (req, res) => {
    const { slug } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const chapterKey = typeof req.query.chapterKey === 'string' ? req.query.chapterKey : undefined;
        const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
        const repo = new mongoRepository_1.ConsultationSubmissionsRepository();
        const data = chapterKey
            ? await repo.getPublicBySlugAndChapter(slug, chapterKey, limit)
            : await repo.getPublicBySlug(slug, limit);
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
        return res.json({ success: true, data });
    }
    catch (e) {
        console.error('Public submissions list failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
});
// Public: fetch one published submission by id
router.get('/consultations/:slug/submissions/:id', readLimiter, async (req, res) => {
    const { slug, id } = req.params;
    const payload = (0, consultations_1.getConsultationBySlug)(slug);
    if (!payload)
        return res.status(404).json({ success: false, message: 'Consultation not found' });
    try {
        const repo = new mongoRepository_1.ConsultationSubmissionsRepository();
        const item = await repo.getPublicById(id);
        if (!item)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
        return res.json({ success: true, data: item });
    }
    catch (e) {
        console.error('Public submission fetch failed:', e);
        return res.status(500).json({ success: false, message: 'Failed to fetch submission' });
    }
});
//# sourceMappingURL=public-community.js.map