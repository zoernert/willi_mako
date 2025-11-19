# Legacy App API Unification - Risiko & Aufwandsanalyse

**Datum:** 19. November 2025  
**Kontext:** Vereinheitlichung aller Backend-API-Aufrufe in eine zentrale `api.js`  
**Ziel:** Bessere Wartbarkeit, konsistentes Error-Handling, Rate-Limit-Tracking

## Executive Summary

**Empfehlung:** ✅ **Schrittweise Migration mit mittlerem Priorität**

**Begründung:**
- Legacy App hat **3 verschiedene API-Client-Muster** (axios, fetch, XMLHttpRequest)
- ~**60+ direkte API-Aufrufe** müssen migriert werden
- Guter Basis-Client existiert bereits (`apiClient.ts`)
- Risiko: Mittel (viele Touchpoints, aber klare Struktur)
- Aufwand: **40-60 Stunden** (strukturierte Migration)
- ROI: **Hoch** (bessere Wartbarkeit, einfacheres Testing, Rate-Limit-Tracking möglich)

---

## Ist-Analyse: Aktuelle API-Client-Landschaft

### 1. Drei Haupt-Ansätze

| Ansatz | Files | Verwendung | Status |
|--------|-------|-----------|---------|
| **apiClient.ts (axios)** | 10+ Services | Strukturiert, mit Interceptors | ✅ Best Practice |
| **Native fetch** | 30+ Komponenten | Direkt in Komponenten | ⚠️ Inkonsistent |
| **Custom Service** | 3 Services | Eigene fetch-Wrapper | ⚠️ Dupliziert |
| **XMLHttpRequest** | 1 (documentsApi) | File-Upload mit Progress | ⚠️ Legacy |

### 2. Detaillierte Aufschlüsselung

#### 2.1 Services mit apiClient.ts ✅
**Bereits korrekt implementiert:**

```typescript
// app-legacy/src/services/chatApi.ts
import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';

export const chatApi = {
  getChats: () => apiClient.get(API_ENDPOINTS.chat.list),
  sendMessage: (chatId, data) => apiClient.post(API_ENDPOINTS.chat.sendMessage(chatId), data)
};
```

**Files:**
- ✅ `chatApi.ts` - Chat-Operationen
- ✅ `documentsApi.ts` - Dokument-Operationen (teilweise)
- ✅ `notesApi.ts` - Notizen
- ✅ `quizApi.ts` - Quiz-System
- ✅ `userApi.ts` - User-Profile
- ✅ `workspaceApi.ts` - Workspace-Verwaltung
- ✅ `teamService.ts` - Team-Management
- ✅ `bilateralClarificationService.ts` - Bilateral Clarifications
- ✅ `messageAnalyzerApi.ts` - Message Analyzer
- ✅ `processService.ts` - Prozess-Verwaltung

**Anzahl:** ~10 Services (ca. 40% der API-Calls)

#### 2.2 Komponenten mit direkten fetch-Calls ⚠️
**Müssen migriert werden:**

```typescript
// Beispiel: app-legacy/src/components/Timeline/TimelineSelector.tsx
const response = await fetch('/api/timelines', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});
```

**Files:**
- ⚠️ `components/Timeline/*` - 6 Komponenten, ~15 API-Calls
- ⚠️ `components/BilateralClarifications/*` - 3 Komponenten, ~5 API-Calls
- ⚠️ `components/Community/*` - 2 Komponenten, ~3 API-Calls
- ⚠️ `components/Chat/ScreenshotUpload.tsx` - 1 API-Call
- ⚠️ `components/ScreenshotAnalyzer.tsx` - 1 API-Call
- ⚠️ `pages/Community.tsx` - 2 API-Calls
- ⚠️ `pages/CommunityThreadDetail.tsx` - 4 API-Calls
- ⚠️ `pages/TeamInvitationPage.tsx` - 1 API-Call
- ⚠️ `pages/TimelineDashboard.tsx` - 2 API-Calls

**Anzahl:** ~15 Files mit ~35 direkten fetch-Calls (ca. 50% der API-Calls)

#### 2.3 Custom Service mit eigenem fetch-Wrapper ⚠️
**Sollten auf apiClient migriert werden:**

```typescript
// app-legacy/src/services/communityService.ts
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  return response.json();
};
```

**Files:**
- ⚠️ `communityService.ts` - Eigener fetch-Wrapper
- ⚠️ `timelineService.ts` - Kommentar erwähnt "alte fetch()-Aufrufe"
- ⚠️ `vectorContentService.ts` - Möglicherweise eigener Wrapper

**Anzahl:** ~3 Services (ca. 10% der API-Calls)

#### 2.4 XMLHttpRequest für Upload-Progress ⚠️

```typescript
// app-legacy/src/services/documentsApi.ts
uploadDocumentWithProgress: (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 80);
        onProgress(progress);
      }
    });
    // ... XMLHttpRequest setup
  });
}
```

**Herausforderung:** XMLHttpRequest bietet native Progress-Events, axios/fetch benötigen Workarounds.

---

## Risiko-Analyse

### Risiko-Matrix

| Kategorie | Risiko | Begründung | Mitigation |
|-----------|--------|------------|------------|
| **Breaking Changes** | 🟡 Mittel | Viele Komponenten betroffen | Schrittweise Migration, Testing |
| **Error-Handling** | 🟢 Niedrig | apiClient hat bereits Interceptors | Error-Handler übernehmen |
| **Auth-Token** | 🟢 Niedrig | Interceptor holt Token automatisch | Bereits in apiClient implementiert |
| **File-Upload-Progress** | 🟡 Mittel | XMLHttpRequest → axios Migration | axios onUploadProgress verwenden |
| **Response-Parsing** | 🟢 Niedrig | Standardisiert durch apiClient | Consistent API |
| **Testing** | 🟡 Mittel | Viele Komponenten zu testen | Jest Mocks für apiClient |
| **Regressions** | 🟡 Mittel | Subtile Verhaltensänderungen | E2E-Tests, Staging-Tests |

### Kritische Risiko-Bereiche

#### 1. Timeline-Feature (Höchste Priorität)
**Risiko:** 🟡 Mittel  
**Grund:** 6 Komponenten mit 15+ direkten fetch-Calls  
**Mitigation:**
- Timeline als erstes migrieren (isoliertes Feature)
- Staging-Tests vor Production-Deployment
- User-Testing mit Timeline-Power-Usern

#### 2. File-Upload mit Progress
**Risiko:** 🟡 Mittel  
**Grund:** XMLHttpRequest → axios onUploadProgress  
**Mitigation:**
```typescript
// Migration von XMLHttpRequest zu axios
uploadDocumentWithProgress: (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient.post(API_ENDPOINTS.documents.upload, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const progress = Math.round((progressEvent.loaded / progressEvent.total) * 80);
      if (onProgress) onProgress(progress);
    }
  });
}
```

**Test:** Upload von 50MB+ Dateien mit Progress-Bar

#### 3. Community-Service (Eigener fetch-Wrapper)
**Risiko:** 🟢 Niedrig  
**Grund:** Isolierter Service, klare Schnittstelle  
**Mitigation:**
- Service-Interface beibehalten
- Nur interne Implementation ändern
- Unit-Tests für Service-Methods

---

## Aufwands-Schätzung

### Gesamt: 40-60 Stunden

| Phase | Aufwand | Details |
|-------|---------|---------|
| **1. Vorbereitung** | 4h | Analyse, Plan, apiClient erweitern |
| **2. Services Migration** | 8h | communityService, timelineService, etc. |
| **3. Timeline Components** | 12h | 6 Komponenten, 15 API-Calls |
| **4. BilateralClarifications** | 6h | 3 Komponenten, 5 API-Calls |
| **5. Community Pages** | 4h | 2 Pages, 6 API-Calls |
| **6. Sonstige Components** | 6h | Screenshot, Chat, Invitation |
| **7. File-Upload-Progress** | 4h | XMLHttpRequest → axios Migration |
| **8. Testing** | 10h | Unit, Integration, E2E |
| **9. Code Review & Refactoring** | 4h | Cleanup, Optimierungen |
| **10. Documentation** | 2h | Update README, JSDoc |

### Detaillierte Aufschlüsselung

#### Phase 1: Vorbereitung (4h)
- [ ] Analyse aller fetch/axios Calls (1h)
- [ ] API_ENDPOINTS erweitern für fehlende Endpoints (1h)
- [ ] apiClient.ts erweitern (Progress-Support, etc.) (1h)
- [ ] Migrations-Checkliste erstellen (1h)

#### Phase 2: Services Migration (8h)
- [ ] `communityService.ts` → apiClient (2h)
- [ ] `timelineService.ts` → apiClient (2h)
- [ ] `vectorContentService.ts` → apiClient (2h)
- [ ] `embeddingService.js` (axios calls) → apiClient (2h)

#### Phase 3: Timeline Components (12h)
- [ ] `TimelineSelector.tsx` (4 API-Calls) → 2h
- [ ] `TimelineDetailView.tsx` (7 API-Calls) → 3h
- [ ] `TimelineDashboardWidget.tsx` (2 API-Calls) → 1.5h
- [ ] `TimelineOverviewWidget.tsx` (3 API-Calls) → 2h
- [ ] `TimelineDashboard.tsx` (2 API-Calls) → 1.5h
- [ ] Testing Timeline-Feature → 2h

#### Phase 4: BilateralClarifications (6h)
- [ ] `NoteSelectorDialog.tsx` (1 API-Call) → 1h
- [ ] `LLMEmailComposerDialog.tsx` (2 API-Calls) → 2h
- [ ] `ClarificationDetailModal.tsx` (1 API-Call) → 1h
- [ ] Testing Bilateral Clarifications → 2h

#### Phase 5: Community Pages (4h)
- [ ] `Community.tsx` (2 API-Calls) → 1h
- [ ] `CommunityThreadDetail.tsx` (4 API-Calls) → 2h
- [ ] Testing Community Feature → 1h

#### Phase 6: Sonstige Components (6h)
- [ ] `ScreenshotAnalyzer.tsx` (1 API-Call) → 1h
- [ ] `ScreenshotUpload.tsx` (1 API-Call) → 1h
- [ ] `CommunityEscalationModal.tsx` (1 API-Call) → 1h
- [ ] `TeamInvitationPage.tsx` (1 API-Call) → 1h
- [ ] Testing → 2h

#### Phase 7: File-Upload-Progress (4h)
- [ ] XMLHttpRequest → axios onUploadProgress (2h)
- [ ] Testing mit großen Dateien (50MB+) (2h)

#### Phase 8: Testing (10h)
- [ ] Unit-Tests für apiClient (2h)
- [ ] Integration-Tests für Services (3h)
- [ ] E2E-Tests für kritische Flows (3h)
- [ ] Staging-Tests (2h)

#### Phase 9: Code Review & Refactoring (4h)
- [ ] Code-Review (2h)
- [ ] Refactoring & Optimierungen (2h)

#### Phase 10: Documentation (2h)
- [ ] README aktualisieren (1h)
- [ ] JSDoc für apiClient (1h)

---

## Migrations-Strategie

### Empfohlener Ansatz: **Schrittweise Feature-basierte Migration**

#### Strategie-Überblick

```
┌────────────────────────────────────────────────────┐
│ Phase 1: Isolierte Features (geringes Risiko)     │
│ - Timeline (6 Components)                          │
│ - Community Pages (2 Pages)                        │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│ Phase 2: Services mit eigenem Wrapper             │
│ - communityService.ts                              │
│ - timelineService.ts                               │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│ Phase 3: Kritische Features (höheres Risiko)      │
│ - File-Upload-Progress (XMLHttpRequest → axios)   │
│ - BilateralClarifications                          │
└────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────┐
│ Phase 4: Verbleibende Komponenten                 │
│ - Screenshot, Chat, Invitation                     │
└────────────────────────────────────────────────────┘
```

### Vor-Nachteile verschiedener Strategien

| Strategie | Vorteile | Nachteile | Empfehlung |
|-----------|----------|-----------|------------|
| **Big Bang** (alles auf einmal) | Schnell fertig, konsistent | Hohes Risiko, schwer zu testen | ❌ Nicht empfohlen |
| **Feature-basiert** (Timeline → Community → etc.) | Isoliert, testbar, geringes Risiko | Längere Gesamtdauer | ✅ **Empfohlen** |
| **Layer-basiert** (Services → Components) | Logische Trennung | Services/Components sind verzahnt | 🟡 Okay |
| **File-by-File** (Datei für Datei) | Sehr granular | Zu langsam, inkonsistent | ❌ Nicht empfohlen |

### Detaillierter Migrations-Plan

#### Sprint 1: Timeline-Feature (1 Woche, 16h)
**Ziel:** Timeline vollständig auf apiClient migrieren

1. **Vorbereitung (2h)**
   - [ ] API_ENDPOINTS.timeline erweitern
   - [ ] timelineService.ts erstellen (mit apiClient)

2. **Component-Migration (10h)**
   - [ ] TimelineSelector.tsx
   - [ ] TimelineDetailView.tsx
   - [ ] TimelineDashboardWidget.tsx
   - [ ] TimelineOverviewWidget.tsx
   - [ ] TimelineDashboard.tsx

3. **Testing (4h)**
   - [ ] Unit-Tests für timelineService
   - [ ] Integration-Tests
   - [ ] Staging-Deployment
   - [ ] User-Testing

**Deliverables:**
- ✅ Timeline-Feature 100% auf apiClient
- ✅ Tests passed
- ✅ Staging verified

#### Sprint 2: Community-Feature (1 Woche, 12h)
**Ziel:** Community vollständig auf apiClient migrieren

1. **Service-Migration (4h)**
   - [ ] communityService.ts auf apiClient umstellen
   - [ ] Interface beibehalten für Rückwärtskompatibilität

2. **Page-Migration (4h)**
   - [ ] Community.tsx (fetch-Calls entfernen, Service nutzen)
   - [ ] CommunityThreadDetail.tsx (fetch-Calls entfernen)

3. **Testing (4h)**
   - [ ] Unit-Tests
   - [ ] E2E-Tests für Community-Flow
   - [ ] Staging-Deployment

**Deliverables:**
- ✅ Community-Feature 100% auf apiClient
- ✅ CommunityService interface preserved

#### Sprint 3: File-Upload + Sonstige (1 Woche, 14h)
**Ziel:** File-Upload-Progress modernisieren, restliche Komponenten migrieren

1. **File-Upload-Progress (4h)**
   - [ ] XMLHttpRequest → axios onUploadProgress
   - [ ] Testing mit großen Dateien

2. **BilateralClarifications (6h)**
   - [ ] NoteSelectorDialog, LLMEmailComposerDialog, ClarificationDetailModal

3. **Sonstige (4h)**
   - [ ] ScreenshotAnalyzer, ScreenshotUpload, CommunityEscalationModal, TeamInvitationPage

**Deliverables:**
- ✅ File-Upload modernisiert
- ✅ Alle verbleibenden Komponenten migriert

#### Sprint 4: Testing & Cleanup (0.5 Wochen, 8h)
**Ziel:** Vollständiges Testing, Code-Cleanup, Dokumentation

1. **Comprehensive Testing (4h)**
   - [ ] Vollständige E2E-Test-Suite
   - [ ] Staging-Deployment aller Features
   - [ ] User-Acceptance-Testing

2. **Code-Review & Refactoring (2h)**
   - [ ] Code-Review aller Änderungen
   - [ ] Refactoring & Optimierungen

3. **Documentation (2h)**
   - [ ] README aktualisieren
   - [ ] JSDoc vervollständigen

**Deliverables:**
- ✅ Alle Tests passed
- ✅ Code reviewed
- ✅ Documentation complete

---

## ROI-Bewertung

### Kosten
- **Entwicklungszeit:** 40-60 Stunden (ca. 1-1.5 Monate bei Teil-Kapazität)
- **Testing-Zeit:** 10 Stunden (bereits in Gesamt-Zeit enthalten)
- **Risiko-Kosten:** Potenzielle Bugs/Regressions (geschätzt: 5-10h Nacharbeit)

**Gesamt-Kosten:** 45-70 Stunden

### Nutzen

#### Sofort-Nutzen
1. **Konsistentes Error-Handling** ✅
   - Zentrale 401-Redirect-Logik
   - Einheitliche Error-Messages
   - User-Friendly Fehlerbehandlung

2. **Einfacheres Rate-Limit-Tracking** ✅
   - Zentrale Stelle für Rate-Limit-Detection
   - Plausible Analytics Integration möglich
   - **Löst das Problem aus vorheriger Analyse!**

3. **Bessere Testbarkeit** ✅
   - Einfache Mocks für apiClient
   - Isolierte Unit-Tests
   - Bessere Code-Coverage

4. **Auth-Token-Management** ✅
   - Automatisches Token-Handling
   - Keine manuellen localStorage.getItem() Calls
   - Refresh-Token-Support möglich

#### Langfrist-Nutzen
1. **Wartbarkeit** ✅
   - Eine Stelle für API-Logik
   - Einfacheres Debugging
   - Weniger Code-Duplizierung

2. **Erweiterbarkeit** ✅
   - Neue Features (z.B. Retry-Logic, Caching) zentral hinzufügen
   - API-Version-Management
   - Request-Logging/Monitoring

3. **Onboarding** ✅
   - Neue Entwickler verstehen Architektur schneller
   - Klare Conventions
   - Bessere Dokumentation

4. **Performance-Optimierung** ✅
   - Request-Caching möglich
   - Request-Deduplication
   - Lazy-Loading von Daten

### ROI-Rechnung

```
Kosten: 60 Stunden Entwicklung

Nutzen (geschätzt pro Jahr):
- Debugging-Zeit-Ersparnis: 20h/Jahr
- Feature-Entwicklung-Speed-Up: 30h/Jahr
- Onboarding-Zeit-Ersparnis: 10h/Jahr (pro neuem Entwickler)
- Weniger Bugs durch konsistentes Handling: 15h/Jahr

Gesamt-Nutzen: 75h/Jahr

ROI Break-Even: ~8 Monate
ROI nach 1 Jahr: +15 Stunden (25% ROI)
ROI nach 2 Jahren: +90 Stunden (150% ROI)
```

**Fazit:** ✅ **ROI ist positiv nach < 1 Jahr**

---

## Technische Details: Ziel-Architektur

### 1. Zentraler API-Client (apiClient.ts)

```typescript
// app-legacy/src/services/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request Interceptor - Auto-Auth
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response Interceptor - Error-Handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Rate Limit Detection
        if (error.response?.status === 429) {
          this.trackRateLimit(error);
        }
        
        // Unauthorized Redirect
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/login';
        }
        
        return Promise.reject(this.formatError(error));
      }
    );
  }

  // Rate Limit Tracking (NEU!)
  private trackRateLimit(error: any) {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('rate_limit_exceeded', {
        props: {
          endpoint: error.config?.url || 'unknown',
          method: error.config?.method || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Standard HTTP Methods
  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config).then(res => res.data);
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config).then(res => res.data);
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config).then(res => res.data);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config).then(res => res.data);
  }

  public patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch(url, data, config).then(res => res.data);
  }

  // File Upload mit Progress
  public uploadWithProgress<T = any>(
    url: string, 
    formData: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<T> {
    return this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(progress);
        }
      }
    }).then(res => res.data);
  }

  public getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }

  private clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
  }

  private formatError(error: any): Error {
    const message = error.response?.data?.error 
      || error.response?.data?.message 
      || error.message 
      || 'Unknown error';
    return new Error(message);
  }
}

export default new ApiClient();
```

### 2. Zentrale Endpoint-Definitionen (apiEndpoints.ts)

```typescript
// app-legacy/src/services/apiEndpoints.ts
export const API_ENDPOINTS = {
  // ... existing endpoints ...

  // Timeline (NEU)
  timeline: {
    list: '/timelines',
    detail: (id: string) => `/timelines/${id}`,
    activate: (id: string) => `/timelines/${id}/activate`,
    archive: (id: string) => `/timelines/${id}/archive`,
    export: (id: string, format: 'pdf' | 'json') => `/timelines/${id}/export?format=${format}`,
    stats: '/timeline-stats',
    activities: (id: string, params?: URLSearchParams) => 
      `/timelines/${id}/activities${params ? '?' + params : ''}`,
    activityRetry: (activityId: string) => `/timeline-activity/${activityId}/retry`,
    activityDelete: (activityId: string) => `/timeline-activity/${activityId}`,
  },

  // Community (Erweitert)
  community: {
    threads: '/community/threads',
    threadDetail: (id: string) => `/community/threads/${id}`,
    threadComments: (id: string) => `/community/threads/${id}/comments`,
    threadDocument: (id: string) => `/community/threads/${id}/document`,
  },

  // ... weitere Endpoints ...
};
```

### 3. Feature-Services (Wrapper um apiClient)

```typescript
// app-legacy/src/services/timelineService.ts
import apiClient from './apiClient';
import { API_ENDPOINTS } from './apiEndpoints';

export const timelineService = {
  // Get all timelines
  getTimelines: async (activeOnly: boolean = false) => {
    const params = activeOnly ? '?active_only=true' : '';
    return apiClient.get(`${API_ENDPOINTS.timeline.list}${params}`);
  },

  // Activate timeline
  activateTimeline: async (timelineId: string) => {
    return apiClient.post(API_ENDPOINTS.timeline.activate(timelineId));
  },

  // Archive timeline
  archiveTimeline: async (timelineId: string) => {
    return apiClient.post(API_ENDPOINTS.timeline.archive(timelineId));
  },

  // Export timeline
  exportTimeline: async (timelineId: string, format: 'pdf' | 'json') => {
    return apiClient.get(API_ENDPOINTS.timeline.export(timelineId, format), {
      responseType: 'blob' // For file download
    });
  },

  // Get timeline activities
  getActivities: async (timelineId: string, options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.status) params.append('status', options.status);
    
    return apiClient.get(API_ENDPOINTS.timeline.activities(timelineId, params));
  },

  // Retry activity
  retryActivity: async (activityId: string) => {
    return apiClient.post(API_ENDPOINTS.timeline.activityRetry(activityId));
  },

  // Delete activity
  deleteActivity: async (activityId: string) => {
    return apiClient.delete(API_ENDPOINTS.timeline.activityDelete(activityId));
  },
};
```

### 4. Component-Verwendung (Vorher/Nachher)

#### Vorher (direkte fetch-Calls)

```tsx
// app-legacy/src/components/Timeline/TimelineSelector.tsx (VORHER)
const loadTimelines = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/timelines', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load timelines');
    }
    
    const data = await response.json();
    setTimelines(data);
  } catch (error) {
    console.error('Error loading timelines:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

#### Nachher (Service-basiert)

```tsx
// app-legacy/src/components/Timeline/TimelineSelector.tsx (NACHHER)
import { timelineService } from '../../services/timelineService';

const loadTimelines = async () => {
  setLoading(true);
  try {
    const data = await timelineService.getTimelines();
    setTimelines(data);
  } catch (error) {
    console.error('Error loading timelines:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**Vorteile:**
- ✅ Weniger Code (7 Zeilen → 4 Zeilen)
- ✅ Kein manuelles Token-Handling
- ✅ Kein manuelles Response-Parsing
- ✅ Konsistentes Error-Handling
- ✅ Testbar (Service kann gemockt werden)

---

## Testing-Strategie

### 1. Unit-Tests für apiClient

```typescript
// app-legacy/src/services/__tests__/apiClient.test.ts
import apiClient from '../apiClient';
import axios from 'axios';

jest.mock('axios');

describe('ApiClient', () => {
  it('should add auth token to requests', async () => {
    localStorage.setItem('token', 'test-token');
    
    await apiClient.get('/test');
    
    expect(axios.create).toHaveBeenCalled();
    // Verify interceptor adds Authorization header
  });

  it('should track rate limits to Plausible', async () => {
    window.plausible = jest.fn();
    
    // Mock 429 response
    // ... test rate limit tracking
  });

  it('should redirect to login on 401', async () => {
    // Mock 401 response
    // Verify redirect happens
  });
});
```

### 2. Integration-Tests für Services

```typescript
// app-legacy/src/services/__tests__/timelineService.test.ts
import { timelineService } from '../timelineService';
import apiClient from '../apiClient';

jest.mock('../apiClient');

describe('TimelineService', () => {
  it('should fetch timelines', async () => {
    const mockData = [{ id: '1', name: 'Test Timeline' }];
    (apiClient.get as jest.Mock).mockResolvedValue(mockData);
    
    const result = await timelineService.getTimelines();
    
    expect(result).toEqual(mockData);
    expect(apiClient.get).toHaveBeenCalledWith('/timelines');
  });

  it('should activate timeline', async () => {
    await timelineService.activateTimeline('123');
    
    expect(apiClient.post).toHaveBeenCalledWith('/timelines/123/activate');
  });
});
```

### 3. E2E-Tests für kritische Flows

```typescript
// cypress/e2e/timeline.cy.ts
describe('Timeline Feature', () => {
  beforeEach(() => {
    cy.login(); // Custom command
  });

  it('should load and display timelines', () => {
    cy.visit('/timeline');
    cy.get('[data-testid="timeline-list"]').should('exist');
    cy.get('[data-testid="timeline-item"]').should('have.length.gt', 0);
  });

  it('should activate a timeline', () => {
    cy.visit('/timeline');
    cy.get('[data-testid="timeline-item"]:first').click();
    cy.get('[data-testid="activate-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should handle rate limit gracefully', () => {
    // Intercept and mock 429 response
    cy.intercept('POST', '/api/timelines/*/activate', {
      statusCode: 429,
      body: { error: 'Too many requests' }
    });

    cy.get('[data-testid="activate-button"]').click();
    cy.get('[data-testid="error-message"]').should('contain', 'Too many requests');
    
    // Verify Plausible event
    cy.window().then((win) => {
      expect(win.plausible).to.have.been.calledWith('rate_limit_exceeded');
    });
  });
});
```

---

## Empfehlungen & Next Steps

### Sofort-Empfehlungen (Priorität: Hoch)

1. ✅ **Migrations-Projekt anlegen**
   - Erstelle GitHub Issue oder Jira Epic
   - Plane Sprints (4 Sprints à 1 Woche)
   - Assign Developer

2. ✅ **Branch-Strategie**
   - Feature-Branch: `feature/api-unification`
   - Sub-Branches pro Sprint: `feature/api-unification-timeline`, etc.
   - PR pro Sprint mit Code-Review

3. ✅ **Testing-Setup**
   - Unit-Tests für apiClient schreiben
   - E2E-Tests für kritische Flows vorbereiten
   - Staging-Environment für Testing nutzen

### Sprint-Planning

**Sprint 1 (Woche 1): Timeline-Feature**
- Entwickler: 1 Person, 16h
- Review: Code-Review + Staging-Test
- Deliverable: Timeline 100% auf apiClient

**Sprint 2 (Woche 2): Community-Feature**
- Entwickler: 1 Person, 12h
- Review: Code-Review + E2E-Tests
- Deliverable: Community 100% auf apiClient

**Sprint 3 (Woche 3): File-Upload + Sonstige**
- Entwickler: 1 Person, 14h
- Review: Upload-Tests mit großen Dateien
- Deliverable: Alle Components migriert

**Sprint 4 (Woche 4): Testing & Cleanup**
- Entwickler: 1 Person, 8h
- Review: Vollständige E2E-Test-Suite
- Deliverable: Production-Ready

### Long-Term Empfehlungen

1. **API-Client erweitern mit:**
   - Request-Caching (React Query oder SWR Integration)
   - Retry-Logic für Network-Fehler
   - Request-Deduplication
   - Offline-Support (Service Workers)

2. **Monitoring hinzufügen:**
   - Request-Logging in Produktiv-Environment
   - Performance-Metriken (Request-Duration)
   - Error-Rate-Tracking

3. **Documentation:**
   - JSDoc für alle apiClient Methods
   - README mit Verwendungs-Beispielen
   - Architecture Decision Records (ADRs)

---

## Fazit

### ✅ Empfehlung: Schrittweise Migration durchführen

**Begründung:**
- **Risiko:** Mittel (viele Touchpoints, aber klare Struktur)
- **Aufwand:** 40-60 Stunden (überschaubar für 4 Sprints)
- **ROI:** Positiv nach < 1 Jahr (Wartbarkeit, Testbarkeit, Rate-Limit-Tracking)
- **Bonus:** Löst Rate-Limit-Tracking-Problem aus vorheriger Analyse

**Nächster Schritt:**
1. Review dieser Analyse mit Team
2. Sprint-Planning für Sprint 1 (Timeline)
3. Kick-off Migration nächste Woche

### Zusammenfassung in Zahlen

| Metrik | Wert |
|--------|------|
| **Files zu migrieren** | ~15 Components + 3 Services |
| **API-Calls zu migrieren** | ~60+ Calls |
| **Geschätzter Aufwand** | 40-60 Stunden |
| **Sprints** | 4 Sprints à 1 Woche |
| **ROI Break-Even** | < 8 Monate |
| **Risiko-Level** | 🟡 Mittel |
| **Empfehlung** | ✅ Durchführen |

---

**Dokumentiert:** 19. November 2025  
**Autor:** AI Assistant  
**Review:** Pending Team-Review
