# Related Articles - Manual Curation Guide

**Purpose:** Configure curated related article recommendations for top-performing pages  
**Impact:** +10-15% CTR improvement vs automatic tag-based matching  
**Effort:** 2-3 hours for top 10 articles  
**Priority:** HIGH (directly impacts bounce rate reduction)

---

## 📊 Top 10 Articles (by Traffic - Nov 8-14)

Based on Plausible Analytics data from `/docs/strategy/metrics-20251114/plausible/top_pages.csv`:

1. **UTILMD Stammdaten** (`utilmd-stammdaten`) - 45 visitors
2. **GPKE Geschäftsprozesse** (`gpke-geschaeftsprozesse`) - 38 visitors
3. **APERAK Z17 Fehler** (`aperak-z17-fehler`) - 32 visitors
4. **REMADV Zahlungsavis** (`remadv-zahlungsavis`) - 28 visitors
5. **Sperrprozess Strom/Gas** (`sperrprozess-strom-gas`) - 24 visitors
6. **BK6-24-210 Verfahrensstand** (`bk6-24-210-verfahrensstand`) - 19 visitors
7. **Lieferantenwechsel Prozess** (`lieferantenwechsel-prozess`) - 17 visitors
8. **EOG Energierichtungsangabe** (`eog-energierichtungsangabe`) - 0 visitors (NEW, not indexed)
9. **APERAK Z20 Fehler** (`aperak-z20-fehler`) - 0 visitors (NEW, not indexed)
10. **Netzentgelte 2025** (`netzentgelte-2025`) - 15 visitors

---

## 🎯 Curation Strategy

### Topic Clusters (Semantic Linking)

#### **Cluster 1: EDIFACT Messages**
**Core Theme:** Technical message formats and error handling

- **UTILMD Stammdaten** →
  - APERAK Z17 Fehler (validation errors)
  - APERAK Z20 Fehler (data inconsistency)
  - REMADV Zahlungsavis (payment settlement)

- **APERAK Z17 Fehler** →
  - UTILMD Stammdaten (triggering message)
  - APERAK Z20 Fehler (related error type)
  - EDIFACT Grundlagen (technical background)

- **APERAK Z20 Fehler** →
  - UTILMD Stammdaten (triggering message)
  - APERAK Z17 Fehler (related error type)
  - Datenqualität MaKo (data quality best practices)

- **REMADV Zahlungsavis** →
  - INVOIC Rechnung (billing context)
  - Zahlungsprozesse (payment workflows)
  - UTILMD Stammdaten (master data link)

#### **Cluster 2: Business Processes**
**Core Theme:** Energy market workflows and procedures

- **GPKE Geschäftsprozesse** →
  - Lieferantenwechsel Prozess (supplier switch)
  - Sperrprozess Strom/Gas (disconnection)
  - UTILMD Stammdaten (data exchange)

- **Lieferantenwechsel Prozess** →
  - GPKE Geschäftsprozesse (framework)
  - UTILMD Stammdaten (data messages)
  - Fristen GPKE (deadlines)

- **Sperrprozess Strom/Gas** →
  - GPKE Geschäftsprozesse (framework)
  - Rechtliche Grundlagen (legal basis)
  - Wiederinbetriebnahme (reconnection)

#### **Cluster 3: Regulation & Compliance**
**Core Theme:** Legal frameworks and regulatory updates

- **BK6-24-210 Verfahrensstand** →
  - Netzentgelte 2025 (network fees)
  - §14a EnWG (controllable loads)
  - Regulierung Energiemarkt (regulatory overview)

- **Netzentgelte 2025** →
  - BK6-24-210 Verfahrensstand (related ruling)
  - Netzentgeltverordnung (legal basis)
  - Kostenstrukturen Netzbetrieb (cost structures)

#### **Cluster 4: Technical Specifications**
**Core Theme:** Technical data points and codes

- **EOG Energierichtungsangabe** →
  - UTILMD Stammdaten (usage context)
  - Bilanzkreismanagement (balancing context)
  - Codelisten BDEW (code tables)

---

## 📝 Implementation Instructions

### Step 1: Add Frontmatter Field

For each article MDX file in `/content/articles/`, add the `relatedArticles` field:

```yaml
---
title: "UTILMD Stammdaten: Vollständiger Guide 2025"
slug: "utilmd-stammdaten"
excerpt: "Alles über UTILMD Stammdatennachrichten..."
date: "2024-11-01"
publishedDate: "2024-11-01T10:00:00Z"
status: "published"
tags: ["EDIFACT", "UTILMD", "Stammdaten", "MaKo"]
description: "UTILMD Stammdaten erklärt! ✅ Nachrichtentypen..."
relatedArticles:
  - "aperak-z17-fehler"
  - "aperak-z20-fehler"
  - "remadv-zahlungsavis"
---
```

**Important:** 
- Use exact slug strings (must match filename without `.mdx`)
- Order matters: First article will appear first in UI
- Recommended: 3-5 related articles per page

### Step 2: Manual Curation Matrix

Copy and paste these curated recommendations into each article's frontmatter:

#### 1. `/content/articles/utilmd-stammdaten/index.mdx`
```yaml
relatedArticles:
  - "aperak-z17-fehler"
  - "aperak-z20-fehler"
  - "gpke-geschaeftsprozesse"
```

#### 2. `/content/articles/gpke-geschaeftsprozesse/index.mdx`
```yaml
relatedArticles:
  - "lieferantenwechsel-prozess"
  - "sperrprozess-strom-gas"
  - "utilmd-stammdaten"
```

#### 3. `/content/articles/aperak-z17-fehler/index.mdx`
```yaml
relatedArticles:
  - "utilmd-stammdaten"
  - "aperak-z20-fehler"
  - "edifact-grundlagen"
```

#### 4. `/content/articles/remadv-zahlungsavis/index.mdx`
```yaml
relatedArticles:
  - "invoic-rechnung"
  - "utilmd-stammdaten"
  - "zahlungsprozesse-energie"
```

#### 5. `/content/articles/sperrprozess-strom-gas/index.mdx`
```yaml
relatedArticles:
  - "gpke-geschaeftsprozesse"
  - "rechtliche-grundlagen-sperrung"
  - "wiederinbetriebnahme"
```

#### 6. `/content/articles/bk6-24-210-verfahrensstand/index.mdx`
```yaml
relatedArticles:
  - "netzentgelte-2025"
  - "para-14a-enwg"
  - "regulierung-energiemarkt"
```

#### 7. `/content/articles/lieferantenwechsel-prozess/index.mdx`
```yaml
relatedArticles:
  - "gpke-geschaeftsprozesse"
  - "utilmd-stammdaten"
  - "fristen-gpke"
```

#### 8. `/content/articles/eog-energierichtungsangabe/index.mdx`
```yaml
relatedArticles:
  - "utilmd-stammdaten"
  - "bilanzkreismanagement"
  - "codelisten-bdew"
```

#### 9. `/content/articles/aperak-z20-fehler/index.mdx`
```yaml
relatedArticles:
  - "utilmd-stammdaten"
  - "aperak-z17-fehler"
  - "datenqualitaet-mako"
```

#### 10. `/content/articles/netzentgelte-2025/index.mdx`
```yaml
relatedArticles:
  - "bk6-24-210-verfahrensstand"
  - "netzentgeltverordnung"
  - "kostenstrukturen-netzbetrieb"
```

### Step 3: Code Integration (Already Done)

The `RelatedArticles` component in `/src/components/RelatedArticles.tsx` automatically uses `manualRelated` prop when available:

```typescript
// Priority 1: Manual override
if (manualRelated && manualRelated.length > 0) {
  const manualArticles = manualRelated
    .map(slug => allArticles.find(a => a.slug === slug))
    .filter(Boolean);
  topRelated.push(...manualArticles.slice(0, maxArticles));
}
```

Article template passes `manualRelated` from frontmatter:

```tsx
<RelatedArticles
  currentArticleSlug={article.slug}
  currentArticleTags={article.tags || []}
  allArticles={allArticles}
  manualRelated={article.relatedArticles} // <-- Auto-populated from frontmatter
  maxArticles={3}
/>
```

### Step 4: Build & Deploy

After updating frontmatter:

```bash
npm run build:next
./quick-deploy.sh
```

---

## 🧪 Testing & Validation

### Local Testing
1. Start dev server: `npm run dev:next-only`
2. Visit article: http://localhost:3003/wissen/artikel/utilmd-stammdaten
3. Scroll to bottom → Verify 3 related articles appear
4. Check that manual recommendations appear (not random newest)

### Production Validation
1. Visit: https://stromhaltig.de/wissen/artikel/utilmd-stammdaten
2. Inspect Related Articles section
3. Click one link → Verify Plausible event fires
4. Check Plausible dashboard for `internal_link_clicked` event

### Analytics Check
```
Event: internal_link_clicked
Props:
  - from: "utilmd-stammdaten"
  - to: "aperak-z17-fehler"
  - component: "RelatedArticles"
  - position: "0"
```

---

## 📈 Performance Expectations

### Baseline (Automatic Tag Matching)
- CTR: 15-20% (industry standard)
- Click pattern: Random based on tag overlap
- User confusion: Moderate (some irrelevant matches)

### With Manual Curation
- **CTR: 25-35%** (+10-15pp improvement)
- Click pattern: Intentional topic progression
- User satisfaction: High (relevant next reads)

### Impact on Bounce Rate
- Automatic: 76% → 70% (-6pp)
- **Manual: 76% → 65% (-11pp)** 🎯
- Full UX optimization: 65% → 60% (-5pp)

---

## 🚨 Common Pitfalls & Solutions

### Issue 1: Article Slug Typo
**Symptom:** Related article doesn't appear  
**Cause:** `relatedArticles: ["aperak-z17"]` (missing `-fehler`)  
**Solution:** Use exact slug from filename without `.mdx` extension

### Issue 2: Circular References
**Symptom:** Article A → Article B → Article A (infinite loop in UI)  
**Cause:** Both articles reference each other  
**Solution:** This is OKAY! RelatedArticles component filters out current article automatically

### Issue 3: Non-Existent Article
**Symptom:** Related Articles section shows only 2 of 3 expected  
**Cause:** `relatedArticles: ["article-that-doesnt-exist"]`  
**Solution:** Check article exists in `/content/articles/` and is published

### Issue 4: Duplicate Recommendations
**Symptom:** Same article appears twice in Related Articles  
**Cause:** Manual list contains duplicates  
**Solution:** Component filters duplicates automatically, but avoid in frontmatter

---

## 🎯 Advanced Strategies

### Strategy 1: Conversion Funnels
**Goal:** Guide users toward high-value conversions

Example for GPKE article (leads to whitepaper download):
```yaml
relatedArticles:
  - "lieferantenwechsel-prozess"  # Related topic
  - "fristen-gpke"                # Deep dive
  - "prozessatlas-m2c"            # WHITEPAPER (conversion)
```

### Strategy 2: Topic Laddering
**Goal:** Progress from basic → advanced content

Example for new users:
```yaml
relatedArticles:
  - "edifact-grundlagen"          # BEGINNER
  - "utilmd-stammdaten"           # INTERMEDIATE
  - "aperak-z17-fehler"           # ADVANCED
```

### Strategy 3: Seasonal Relevance
**Goal:** Promote time-sensitive content

Example during regulatory changes:
```yaml
relatedArticles:
  - "bk6-24-210-verfahrensstand"  # CURRENT NEWS
  - "netzentgelte-2025"           # UPCOMING CHANGES
  - "para-14a-enwg"               # RELATED REGULATION
```

---

## 📊 Monitoring Dashboard

### Plausible Custom View (Setup)
1. Go to https://plausible.io/stromhaltig.de
2. Create custom goal: "Internal Link Clicked"
3. Filter by custom properties:
   - `component = "RelatedArticles"`
4. Group by:
   - `from` (source article)
   - `to` (destination article)
5. Export weekly report

### Key Metrics to Track
- **CTR:** (Clicks / Impressions) per article
- **Top Performers:** Articles with >30% CTR
- **Underperformers:** Articles with <15% CTR
- **Popular Pairs:** Most clicked `from → to` combinations

### Action Plan Based on Data
- **High CTR (>30%):** Study what makes these recommendations work
- **Low CTR (<15%):** Replace manual recommendations or improve tag matching
- **Popular Pairs:** Reinforce in other articles (e.g., if A→B is popular, make B→A)

---

## ✅ Completion Checklist

- [ ] Read this guide thoroughly
- [ ] Understand topic cluster strategy
- [ ] Update UTILMD Stammdaten frontmatter (Test #1)
- [ ] Build & deploy to verify component works
- [ ] Check Plausible for `internal_link_clicked` event
- [ ] Update remaining 9 articles' frontmatter
- [ ] Final build & deploy
- [ ] Monitor bounce rate daily for 7 days
- [ ] Generate Week 1 performance report
- [ ] Iterate on underperforming recommendations

**Estimated Time:** 2-3 hours  
**Priority:** HIGH (blocks bounce rate improvement)  
**Deadline:** November 16-17, 2025 (before Phase 2.7 review)

---

**Guide Version:** 1.0  
**Last Updated:** November 15, 2025  
**Maintainer:** Development Team
