// Central feature flags (can be overridden via window.__FEATURE_FLAGS__ or localStorage)
// Defaults align with Welle 1 rollout plan
export type FeatureFlags = {
  boardView: { enabled: boolean };
  emailImport: { enabled: boolean };
  sendAsIdentity: { enabled: boolean };
  serverFields: { enabled: boolean }; // use server-provided waitingOn/nextActionAt/slaDueAt/lastEditedBy
  attachments: { enabled: boolean };   // show attachment UI
  kpiServer: { enabled: boolean };     // use server KPI endpoint
};

const defaultFlags: FeatureFlags = {
  boardView: { enabled: true },
  emailImport: { enabled: true },
  sendAsIdentity: { enabled: true },
  serverFields: { enabled: true },
  attachments: { enabled: true },
  kpiServer: { enabled: true },
};

// Optional: allow overrides for pilots/debugging
// - window.__FEATURE_FLAGS__ takes precedence
// - localStorage key "featureFlags.override" with JSON
declare global {
  interface Window { __FEATURE_FLAGS__?: Partial<FeatureFlags>; }
}

function mergeFlags(base: FeatureFlags, override?: Partial<FeatureFlags>): FeatureFlags {
  if (!override) return base;
  return {
    boardView: { enabled: override.boardView?.enabled ?? base.boardView.enabled },
    emailImport: { enabled: override.emailImport?.enabled ?? base.emailImport.enabled },
  sendAsIdentity: { enabled: override.sendAsIdentity?.enabled ?? base.sendAsIdentity.enabled },
  serverFields: { enabled: override.serverFields?.enabled ?? base.serverFields.enabled },
  attachments: { enabled: override.attachments?.enabled ?? base.attachments.enabled },
  kpiServer: { enabled: override.kpiServer?.enabled ?? base.kpiServer.enabled },
  };
}

function loadOverrides(): Partial<FeatureFlags> | undefined {
  try {
    if (typeof window !== 'undefined') {
      if (window.__FEATURE_FLAGS__) return window.__FEATURE_FLAGS__;
      const raw = localStorage.getItem('featureFlags.override');
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return undefined;
}

export const featureFlags: FeatureFlags = mergeFlags(defaultFlags, loadOverrides());

export default featureFlags;
