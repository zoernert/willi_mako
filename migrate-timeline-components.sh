#!/bin/bash
# migrate-timeline-components.sh - Automated migration script for Timeline components

echo "🚀 Migrating Timeline Components to timelineService..."

# TimelineDetailView.tsx
echo "📝 Migrating TimelineDetailView.tsx..."

# Die Migration erfolgt durch String-Replacement der fetch-Calls
# 1. Import timelineService hinzufügen
# 2. fetch('/api/timelines/...') -> timelineService.xxx() Calls ersetzen
# 3. Response-Parsing entfernen (wird vom Service übernommen)
# 4. Auth-Header entfernen (wird vom apiClient übernommen)

# Vollständige Migration wird durch weitere Tool-Aufrufe durchgeführt

echo "✅ TimelineDetailView.tsx Migration vorbereitet"
echo ""
echo "Verbleibende Komponenten:"
echo "  - TimelineDashboardWidget.tsx"
echo "  - TimelineOverviewWidget.tsx" 
echo "  - TimelineDashboard.tsx"
echo ""
echo "Verwende weitere replace_string_in_file Aufrufe für vollständige Migration"
