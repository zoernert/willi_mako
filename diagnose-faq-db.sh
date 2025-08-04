#!/bin/bash

# FAQ Datenbank Diagnose Script
echo "🔍 FAQ Datenbank Diagnose"
echo "========================="

# Datenbankverbindung testen
echo "📊 Datenbankstruktur der faqs Tabelle:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
\d faqs
" 2>/dev/null || echo "❌ Kann Tabellenstruktur nicht abrufen"

echo ""
echo "📈 Spalteninfos der faqs Tabelle:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'faqs' 
ORDER BY ordinal_position;
" 2>/dev/null || echo "❌ Kann Spalteninformationen nicht abrufen"

echo ""
echo "🔢 Anzahl FAQs nach Status:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT COUNT(*) as total_faqs FROM faqs;
" 2>/dev/null || echo "❌ Kann FAQ-Anzahl nicht abrufen"

echo ""
echo "📋 Beispiel FAQ-Einträge mit allen relevanten Feldern:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT id, title, 
       CASE WHEN 'is_active' IN (SELECT column_name FROM information_schema.columns WHERE table_name = 'faqs') 
            THEN is_active::text 
            ELSE 'Spalte nicht vorhanden' END as is_active_status,
       CASE WHEN 'is_public' IN (SELECT column_name FROM information_schema.columns WHERE table_name = 'faqs') 
            THEN is_public::text 
            ELSE 'Spalte nicht vorhanden' END as is_public_status,
       created_at 
FROM faqs 
ORDER BY created_at DESC 
LIMIT 5;
" 2>/dev/null || echo "❌ Kann FAQ-Beispiele nicht abrufen"

echo ""
echo "🔍 Suche nach möglichen Status-Spalten:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'faqs' 
  AND (column_name ILIKE '%active%' 
       OR column_name ILIKE '%public%' 
       OR column_name ILIKE '%status%'
       OR column_name ILIKE '%published%'
       OR column_name ILIKE '%visible%');
" 2>/dev/null || echo "❌ Kann Status-Spalten nicht finden"

echo ""
echo "📊 Wenn is_active und is_public existieren - Verteilung der Werte:"
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "
SELECT 
  is_active, 
  is_public, 
  COUNT(*) as anzahl
FROM faqs 
GROUP BY is_active, is_public 
ORDER BY anzahl DESC;
" 2>/dev/null || echo "❌ Kann Status-Verteilung nicht abrufen (Spalten existieren möglicherweise nicht)"
