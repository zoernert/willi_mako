import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../services/apiClient';

type ArticleListItem = {
  slug: string;
  title: string;
  whitepaperSlug?: string;
  status: 'draft' | 'published';
  publishedDate?: string;
  shortDescription?: string;
};

type WhitepaperItem = { slug: string; title: string; status: 'draft' | 'published'; publishedDate?: string };

const AdminArticlesManager: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [whitepapers, setWhitepapers] = useState<WhitepaperItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    whitepaperSlug: '',
    shortDescription: '',
    publishedDate: '',
    status: 'draft' as 'draft' | 'published',
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: '',
    content: ''
  });

  const sanitizeSlug = (v: string) =>
    v
      .toLowerCase()
  .replace(/_/g, '-')
  .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  const isSlugValid = useMemo(() => /^[a-z0-9-]+$/.test(form.slug || ''), [form.slug]);

  const filteredArticles = useMemo(() => {
    if (!form.whitepaperSlug) return articles.filter(a => !a.whitepaperSlug);
    return articles.filter(a => a.whitepaperSlug === form.whitepaperSlug);
  }, [articles, form.whitepaperSlug]);

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      const [arts, wps] = await Promise.all([
        apiClient.get<ArticleListItem[]>('/admin/content/articles'),
        apiClient.get<WhitepaperItem[]>('/admin/content/whitepapers')
      ]);
      setArticles(Array.isArray(arts) ? arts : []);
      setWhitepapers(Array.isArray(wps) ? wps : []);
    } catch (e: any) {
      showSnackbar(e.message || 'Fehler beim Laden der Inhalte', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm({
      title: '', slug: '', whitepaperSlug: '', shortDescription: '', publishedDate: '',
      status: 'draft', seoTitle: '', seoDescription: '', canonicalUrl: '', content: ''
    });
    setEditOpen(true);
  };

  const openEdit = async (slug: string) => {
    try {
      setLoading(true);
      const data = await apiClient.get<any>(`/admin/content/articles/${slug}`);
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        whitepaperSlug: data.whitepaperSlug || '',
        shortDescription: data.shortDescription || '',
        publishedDate: data.publishedDate || '',
        status: (data.status as 'draft' | 'published') || 'draft',
        seoTitle: data.seoTitle || '',
        seoDescription: data.seoDescription || '',
        canonicalUrl: data.canonicalUrl || '',
        content: data.content || ''
      });
      setEditOpen(true);
    } catch (e: any) {
      showSnackbar(e.message || 'Fehler beim Laden des Artikels', 'error');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.title || !form.slug) {
      showSnackbar('Titel und Slug sind erforderlich', 'warning');
      return;
    }
    if (!isSlugValid) {
      showSnackbar('Ungültiger Slug. Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt.', 'warning');
      return;
    }
    try {
      await apiClient.post('/admin/content/articles', {
        ...form,
        slug: sanitizeSlug(form.slug),
        whitepaperSlug: form.whitepaperSlug || undefined,
        seoTitle: form.seoTitle?.trim() ? form.seoTitle.trim() : undefined,
        seoDescription: form.seoDescription?.trim() ? form.seoDescription.trim() : undefined,
        canonicalUrl: form.canonicalUrl?.trim() ? form.canonicalUrl.trim() : undefined,
        shortDescription: form.shortDescription?.trim() || undefined,
        commit: true
      });
      showSnackbar('Artikel gespeichert', 'success');
      setEditOpen(false);
      await refresh();
    } catch (e: any) {
      showSnackbar(e.message || 'Speichern fehlgeschlagen', 'error');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Fachartikel verwalten (MDX)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Artikel werden als MDX-Dateien unter <code>content/</code> gespeichert. Medien gehören nach <code>public/</code> und werden mit Root-Pfaden verlinkt.
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Alle Artikel" />
          <Tab label="Nach Whitepaper" />
        </Tabs>
      </Paper>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" onClick={openNew}>Neuer Artikel</Button>
        <Button variant="outlined" onClick={refresh} disabled={loading}>Aktualisieren</Button>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>Whitepaper-Filter</InputLabel>
          <Select
            label="Whitepaper-Filter"
            value={form.whitepaperSlug}
            onChange={e => setForm(prev => ({ ...prev, whitepaperSlug: e.target.value }))}
          >
            <MenuItem value=""><em>Nur eigenständige Artikel</em></MenuItem>
            {whitepapers.map(wp => (
              <MenuItem key={wp.slug} value={wp.slug}>{wp.title} ({wp.slug})</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          {(tab === 0 ? articles : filteredArticles).map(a => (
            <Paper key={a.slug} sx={{ p: 2 }} variant="outlined">
              <Stack spacing={1}>
                <Typography variant="h6">{a.title}</Typography>
                <Typography variant="body2" color="text.secondary">Slug: {a.slug}</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={a.status} color={a.status === 'published' ? 'success' : 'default'} />
                  {a.whitepaperSlug && <Chip size="small" label={`WP: ${a.whitepaperSlug}`} />}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => openEdit(a.slug)}>Bearbeiten</Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Artikel bearbeiten</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 2 }}>
              <TextField
                fullWidth
                label="Titel"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Slug (lowercase, -)"
                value={form.slug}
                onChange={e => setForm({ ...form, slug: sanitizeSlug(e.target.value) })}
                error={!!form.slug && !isSlugValid}
                helperText={!form.slug ? 'z.B. wissensmanagement-energiewirtschaft' : (!isSlugValid ? 'Nur a-z, 0-9 und - erlaubt' : ' ')}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline minRows={12}
                label="Inhalt (MDX)"
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Whitepaper-Zuordnung</InputLabel>
                <Select
                  label="Whitepaper-Zuordnung"
                  value={form.whitepaperSlug}
                  onChange={e => setForm({ ...form, whitepaperSlug: e.target.value })}
                >
                  <MenuItem value=""><em>Keins (flat)</em></MenuItem>
                  {whitepapers.map(wp => (
                    <MenuItem key={wp.slug} value={wp.slug}>{wp.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Kurzbeschreibung"
                value={form.shortDescription}
                onChange={e => setForm({ ...form, shortDescription: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="publishedDate (ISO)"
                value={form.publishedDate}
                onChange={e => setForm({ ...form, publishedDate: e.target.value })}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
                >
                  <MenuItem value="draft">draft</MenuItem>
                  <MenuItem value="published">published</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="SEO Title"
                value={form.seoTitle}
                onChange={e => setForm({ ...form, seoTitle: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="SEO Description"
                value={form.seoDescription}
                onChange={e => setForm({ ...form, seoDescription: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Canonical URL"
                value={form.canonicalUrl}
                onChange={e => setForm({ ...form, canonicalUrl: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={save}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminArticlesManager;
