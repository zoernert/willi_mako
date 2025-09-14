import express from 'express';
import { authenticateToken, AuthenticatedRequest, requireAdmin } from '../../middleware/auth';
import { ConsultationSubmissionsRepository } from '../../modules/consultationSubmissions/mongoRepository';
import { ConsultationIngestService } from '../../services/ConsultationIngestService';
import { getConsultationBySlug } from '../../lib/content/consultations';

const router = express.Router({ mergeParams: true });

// All routes require admin auth
router.use(authenticateToken);
router.use(requireAdmin);

// List submissions (all, including unpublished)
router.get('/consultations/:slug/submissions', async (req: AuthenticatedRequest, res) => {
  try {
    const { slug } = req.params as { slug: string };
    const { status = 'all', published, chapterKey, q, limit, offset } = req.query as any;
    const repo = new ConsultationSubmissionsRepository();
    const data = await repo.listAll(slug, {
      status: (status as any) || 'all',
      published: typeof published === 'string' ? published === 'true' : undefined,
      chapterKey: typeof chapterKey === 'string' ? chapterKey : undefined,
      q: typeof q === 'string' ? q : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ success: true, data });
  } catch (e: any) {
    console.error('Admin list submissions failed:', e);
    res.status(500).json({ success: false, message: 'Failed to list submissions' });
  }
});

// Get one submission (admin)
router.get('/consultations/:slug/submissions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as any;
    const repo = new ConsultationSubmissionsRepository();
    const item = await repo.getById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e: any) {
    console.error('Admin get submission failed:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch submission' });
  }
});

// Update submission (approve/reject/publish, set curated fields)
router.patch('/consultations/:slug/submissions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as any;
    const { status, published, curatedSummary, curatedOpinion } = req.body || {};
    const repo = new ConsultationSubmissionsRepository();
    const updated = await repo.updateById(id, { status, published, curatedSummary, curatedOpinion });
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (e: any) {
    console.error('Admin update submission failed:', e);
    res.status(500).json({ success: false, message: 'Failed to update submission' });
  }
});

// Delete submission
router.delete('/consultations/:slug/submissions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params as any;
    const repo = new ConsultationSubmissionsRepository();
    const ok = await repo.deleteById(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { id, deleted: true } });
  } catch (e: any) {
    console.error('Admin delete submission failed:', e);
    res.status(500).json({ success: false, message: 'Failed to delete submission' });
  }
});

export default router;

// Extra: Ingestion endpoint to (re)index consultation content and references into Qdrant
router.post('/consultations/:slug/ingest', async (req: AuthenticatedRequest, res) => {
  try {
    const { slug } = req.params as { slug: string };
    // Collect text from consultation sections
    const payload = getConsultationBySlug(slug);
    if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
    const base = slug.replace(/[^a-z0-9_-]/gi, '-').toLowerCase().replace(/^mitteilung-/, 'm');
    const svc = new ConsultationIngestService(`consultations-${base}`);
    const items = payload.sections.map((s, idx) => ({
      id: `${s.key}_${idx}`,
      text: `${s.title}\n\n${s.markdown}`.slice(0, 10000),
      source: `https://stromhaltig.de/konsultation/${slug}#${s.key}`,
      meta: { chapterKey: s.key, title: s.title, slug },
    }));
    await svc.ingestText(items);
    res.json({ success: true, data: { count: items.length } });
  } catch (e: any) {
    console.error('Admin consultation ingest failed:', e);
    res.status(500).json({ success: false, message: 'Ingestion failed' });
  }
});
