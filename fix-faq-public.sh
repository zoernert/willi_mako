#!/bin/bash

echo "🔧 FAQ Status Update"
echo "===================="

echo "📊 Aktuelle Status-Verteilung:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT 
  is_active, 
  is_public, 
  COUNT(*) as anzahl
FROM faqs 
GROUP BY is_active, is_public;
"

echo ""
echo "🔄 Setze alle aktiven FAQs auf öffentlich..."
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
UPDATE faqs 
SET is_public = true, updated_at = CURRENT_TIMESTAMP 
WHERE is_active = true AND is_public = false;
"

echo ""
echo "✅ Neue Status-Verteilung:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT 
  is_active, 
  is_public, 
  COUNT(*) as anzahl
FROM faqs 
GROUP BY is_active, is_public;
"

echo ""
echo "📋 Überprüfung - Öffentliche FAQs:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT title, is_active, is_public, updated_at 
FROM faqs 
WHERE is_active = true AND is_public = true 
ORDER BY updated_at DESC;
"
