"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../middleware/auth");
const mongoRepository_1 = require("../../modules/consultationSubmissions/mongoRepository");
const ConsultationIngestService_1 = require("../../services/ConsultationIngestService");
const consultations_1 = require("../../lib/content/consultations");
const router = express_1.default.Router({ mergeParams: true });
// All routes require admin auth
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
// List submissions (all, including unpublished)
router.get('/consultations/:slug/submissions', async (req, res) => {
    try {
        const { slug } = req.params;
        const { status = 'all', published, chapterKey, q, limit, offset } = req.query;
        const repo = new mongoRepository_1.ConsultationSubmissionsRepository();
        const data = await repo.listAll(slug, {
            status: status || 'all',
            published: typeof published === 'string' ? published === 'true' : undefined,
            chapterKey: typeof chapterKey === 'string' ? chapterKey : undefined,
            q: typeof q === 'string' ? q : undefined,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
        res.json({ success: true, data });
    }
    catch (e) {
        console.error('Admin list submissions failed:', e);
        res.status(500).json({ success: false, message: 'Failed to list submissions' });
    }
});
// Get one submission (admin)
router.get('/consultations/:slug/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const repo = new mongoRepository_1.ConsultationSubmissionsRepository();
        const item = await repo.getById(id);
        if (!item)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: item });
    }
    catch (e) {
        console.error('Admin get submission failed:', e);
        res.status(500).json({ success: false, message: 'Failed to fetch submission' });
    }
});
// Update submission (approve/reject/publish, set curated fields)
router.patch('/consultations/:slug/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, published, curatedSummary, curatedOpinion } = req.body || {};
        const repo = new mongoRepository_1.ConsultationSubmissionsRepository();
        const updated = await repo.updateById(id, { status, published, curatedSummary, curatedOpinion });
        if (!updated)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: updated });
    }
    catch (e) {
        console.error('Admin update submission failed:', e);
        res.status(500).json({ success: false, message: 'Failed to update submission' });
    }
});
// Delete submission
router.delete('/consultations/:slug/submissions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const repo = new mongoRepository_1.ConsultationSubmissionsRepository();
        const ok = await repo.deleteById(id);
        if (!ok)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: { id, deleted: true } });
    }
    catch (e) {
        console.error('Admin delete submission failed:', e);
        res.status(500).json({ success: false, message: 'Failed to delete submission' });
    }
});
exports.default = router;
// Extra: Ingestion endpoint to (re)index consultation content and references into Qdrant
router.post('/consultations/:slug/ingest', async (req, res) => {
    try {
        const { slug } = req.params;
        // Collect text from consultation sections
        const payload = (0, consultations_1.getConsultationBySlug)(slug);
        if (!payload)
            return res.status(404).json({ success: false, message: 'Consultation not found' });
        const base = slug.replace(/[^a-z0-9_-]/gi, '-').toLowerCase().replace(/^mitteilung-/, 'm');
        const svc = new ConsultationIngestService_1.ConsultationIngestService(`consultations-${base}`);
        const items = payload.sections.map((s, idx) => ({
            id: `${s.key}_${idx}`,
            text: `${s.title}\n\n${s.markdown}`.slice(0, 10000),
            source: `https://stromhaltig.de/konsultation/${slug}#${s.key}`,
            meta: { chapterKey: s.key, title: s.title, slug },
        }));
        await svc.ingestText(items);
        res.json({ success: true, data: { count: items.length } });
    }
    catch (e) {
        console.error('Admin consultation ingest failed:', e);
        res.status(500).json({ success: false, message: 'Ingestion failed' });
    }
});
//# sourceMappingURL=consultation-submissions.js.map