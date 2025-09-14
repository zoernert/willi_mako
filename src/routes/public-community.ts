import express from 'express';
import rateLimit from 'express-rate-limit';
import { getConsultationBySlug } from '../lib/content/consultations';
import { ConsultationExportService } from '../services/ConsultationExportService';
import { GithubIssuesService } from '../services/GithubIssuesService';
import type { ResponseInput } from '../services/ConsultationExportService';
import { ConsultationAIService } from '../services/ConsultationAIService';
import { ConsultationSearchService } from '../services/ConsultationSearchService';
import { ConsultationSubmissionsRepository } from '../modules/consultationSubmissions/mongoRepository';
import { CommunityService } from '../services/CommunityService';
import db from '../config/database';
import { CommunityPublicationRepository } from '../repositories/CommunityPublicationRepository';

const router = express.Router();

const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
const exportLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 20 });
const responseLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 30 });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
const submitLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });

router.use(readLimiter);

// Published Community Threads (read-only snapshots)
router.get('/threads/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const svc = new CommunityService(db as any);
    const publication = await svc.getPublicationBySlug(slug);
    if (!publication) return res.status(404).json({ success: false, message: 'Not found' });
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
  } catch (e: any) {
    console.error('Public thread fetch failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch publication' });
  }
});

// List all published community thread slugs (for sitemap and simple listings)
router.get('/threads', async (req, res) => {
  try {
    const repo = new CommunityPublicationRepository(db as any);
    const items = await repo.listAllPublic();
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.json({ success: true, data: items });
  } catch (e: any) {
    console.error('Public threads list failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to list publications' });
  }
});

// GET /api/public/community/consultations/:slug
router.get('/consultations/:slug', (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) {
    return res.status(404).json({ success: false, message: 'Consultation not found' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  return res.json({ success: true, data: payload });
});

// Exports
router.get('/consultations/:slug/export.pdf', exportLimiter, async (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
  const issues = await GithubIssuesService.getIssues(false, slug);
  const pdf = await ConsultationExportService.exportPDF(payload, issues);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.pdf"`);
    res.send(pdf);
  } catch (e: any) {
    console.error('Export PDF failed:', e);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

router.get('/consultations/:slug/export.docx', exportLimiter, async (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
  const issues = await GithubIssuesService.getIssues(false, slug);
  const docx = await ConsultationExportService.exportDOCX(payload, issues);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.docx"`);
    res.send(docx);
  } catch (e: any) {
    console.error('Export DOCX failed:', e);
    res.status(500).json({ success: false, message: 'Failed to generate DOCX' });
  }
});

// AI: Summaries per chapter (read-only)
router.get('/consultations/:slug/ai/summaries', aiLimiter, async (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
    const summaries = await ConsultationAIService.summarizeChapters(payload);
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
    return res.json({ success: true, data: summaries });
  } catch (e: any) {
    console.error('AI summaries failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to generate summaries' });
  }
});

// AI: Suggest response text for general and chapter 9
router.post('/consultations/:slug/ai/suggest-response', aiLimiter, async (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
    const body = (req.body || {}) as { role?: string; positionGeneral?: 'zustimmend'|'mit_auflagen'|'ablehnend'|'neutral'; tone?: 'sachlich'|'kurz'|'detail'; chapterKeys?: string[]; selectedIssueNumbers?: number[] };
    let selectedIssues: import('../services/GithubIssuesService').IssueRef[] = [];
    if (Array.isArray(body.selectedIssueNumbers)) {
  const all = await GithubIssuesService.getIssues(false, slug);
      const set = new Set<number>(body.selectedIssueNumbers);
      selectedIssues = all.filter((i) => set.has(i.number));
    }
    const result = await ConsultationAIService.suggestResponse(payload, selectedIssues, {
      role: body.role,
      positionGeneral: body.positionGeneral,
      tone: body.tone,
      chapterKeys: body.chapterKeys,
      selectedIssues,
    });
    return res.json({ success: true, data: result });
  } catch (e: any) {
    console.error('AI suggest-response failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to generate response suggestion' });
  }
});

export default router;

// Issues endpoint after default export (Express tolerates order here in module scope)
router.get('/consultations/:slug/issues', readLimiter, async (req, res) => {
  const { slug } = req.params;
  try {
    const { chapterKey } = req.query as { chapterKey?: string };
    const issues = chapterKey
  ? await GithubIssuesService.getIssuesByChapter(chapterKey, slug)
  : await GithubIssuesService.getIssues(false, slug);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.json({ success: true, data: issues });
  } catch (e: any) {
    console.error('Public issues fetch failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch issues' });
  }
});

// Build a minimal response DOCX to help busy users contribute via official email
router.post('/consultations/:slug/response.docx', responseLimiter, async (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
    const body = (req.body || {}) as Partial<ResponseInput & { selectedIssueNumbers?: number[] }>;
    let selectedIssues: import('../services/GithubIssuesService').IssueRef[] = [];
    if (Array.isArray((body as any).selectedIssueNumbers)) {
      const all = await GithubIssuesService.getIssues(false, slug);
      const set = new Set<number>((body as any).selectedIssueNumbers);
      selectedIssues = all.filter((i) => set.has(i.number));
    }
    const input: ResponseInput = {
      organization: body.organization || '',
      contact: body.contact || '',
      role: body.role || '',
      positionGeneral: (body.positionGeneral as any) || 'neutral',
      remarksGeneral: body.remarksGeneral || '',
      remarksChapter9: body.remarksChapter9 || '',
      selectedIssues,
    };
  const buf = await ConsultationExportService.exportResponseDOCX(slug, input);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-rueckmeldung.docx"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (e: any) {
    console.error('Response DOCX build failed:', e);
    res.status(500).json({ success: false, message: 'Failed to generate response DOCX' });
  }
});

// Read-only: Query contextual snippets from Qdrant for this consultation
router.get('/consultations/:slug/search', searchLimiter, async (req, res) => {
  const { slug } = req.params;
  const q = (req.query.q as string) || '';
  if (!q.trim()) return res.status(400).json({ success: false, message: 'Missing query parameter q' });
  try {
    const svc = new ConsultationSearchService();
    const hits = await svc.search(slug, q, Math.min(5, Number(req.query.k || 3)));
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    return res.json({ success: true, data: hits });
  } catch (e: any) {
    console.error('Consultation search failed:', e);
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// Submit a chapter-specific comment (stored internally; publication curated)
router.post('/consultations/:slug/submit', submitLimiter, async (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
    const body = (req.body || {}) as { chapterKey?: string; author?: string; organization?: string; contact?: string; comment?: string };
    const chapterKey = (body.chapterKey || '').trim();
    const comment = (body.comment || '').trim();
    if (!chapterKey) return res.status(400).json({ success: false, message: 'Missing chapterKey' });
    if (!comment) return res.status(400).json({ success: false, message: 'Missing comment' });
    const repo = new ConsultationSubmissionsRepository();
    const created = await repo.create({
      slug,
      chapterKey,
      author: (body.author || '').trim() || undefined,
      organization: (body.organization || '').trim() || undefined,
      contact: (body.contact || '').trim() || undefined,
      comment,
    });
    // Only return a minimal acknowledgment and a local permalink to a public page once published
    return res.json({ success: true, data: { id: String((created as any)._id), permalink: `/konsultation/${slug}/rueckmeldung/${String((created as any)._id)}`, status: created.status } });
  } catch (e: any) {
    console.error('Submit consultation comment failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to submit comment' });
  }
});

// Public: list published submissions for a consultation (optionally by chapter)
router.get('/consultations/:slug/submissions', readLimiter, async (req, res) => {
  const { slug } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
    const fast = (req.query.fast as string) === '1' || (req.query.fast as string) === 'true';
    if (fast) {
      // Fast mode for sitemap and health checks: avoid Mongo dependency/timeouts
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ success: true, data: [] });
    }
    const chapterKey = typeof req.query.chapterKey === 'string' ? req.query.chapterKey : undefined;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const repo = new ConsultationSubmissionsRepository();
    const data = chapterKey
      ? await repo.getPublicBySlugAndChapter(slug, chapterKey, limit)
      : await repo.getPublicBySlug(slug, limit);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    return res.json({ success: true, data });
  } catch (e: any) {
    console.error('Public submissions list failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
});

// Public: fetch one published submission by id
router.get('/consultations/:slug/submissions/:id', readLimiter, async (req, res) => {
  const { slug, id } = req.params;
  const payload = getConsultationBySlug(slug);
  if (!payload) return res.status(404).json({ success: false, message: 'Consultation not found' });
  try {
    const repo = new ConsultationSubmissionsRepository();
    const item = await repo.getPublicById(id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    return res.json({ success: true, data: item });
  } catch (e: any) {
    console.error('Public submission fetch failed:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch submission' });
  }
});
