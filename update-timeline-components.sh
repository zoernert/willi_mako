#!/bin/bash

# Script zur Umstellung aller Timeline-Komponenten auf den zentralen API-Service

echo "Updating Timeline components to use central API service..."

# Find and replace fetch calls with timelineService calls in all Timeline components
find app-legacy/src/components/Timeline/ -name "*.tsx" -exec sed -i 's|fetch(`/api/timeline|timelineService.|g' {} \;
find app-legacy/src/components/Timeline/ -name "*.tsx" -exec sed -i 's|fetch("/api/timeline|timelineService.|g' {} \;
find app-legacy/src/components/Timeline/ -name "*.tsx" -exec sed -i 's|fetch(\`/api/timeline|timelineService.|g' {} \;

# Update imports to include timelineService
find app-legacy/src/components/Timeline/ -name "*.tsx" -exec sed -i '1i import { timelineService } from "../../services/timelineService";' {} \;

echo "Timeline components updated!"
echo "Note: Manual verification and testing required."
