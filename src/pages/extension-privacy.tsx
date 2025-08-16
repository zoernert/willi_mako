import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ExtensionPrivacyPage() {
  return (
    <>
      <Head>
        <title>Datenschutzerklärung - Willi-Mako Chrome Extension</title>
        <meta name="description" content="Datenschutzerklärung für die Willi-Mako Chrome Extension zur Screenshot-Analyse von Energiewirtschafts-Codes" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Datenschutzerklärung - Willi-Mako Chrome Extension" />
        <meta property="og:description" content="Umfassende Datenschutzerklärung für die Willi-Mako Chrome Extension" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/extension-privacy" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.69 2.21L4.33 11.49c-.64.58-.28 1.65.58 1.73L8 13.64V20c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-6.36l3.09-.42c.86-.08 1.22-1.15.58-1.73L9.31 2.21c-.41-.37-1.02-.37-1.43 0z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">Stromhaltig</div>
                  <div className="text-sm text-gray-600">Willi Mako</div>
                </div>
              </div>
              <nav className="flex space-x-6">
                <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Hauptanwendung
                </Link>
                <Link href="/chrome-extension" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Chrome Extension
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              Datenschutzerklärung - Willi-Mako Chrome Extension
            </h1>

            <div className="prose prose-lg max-w-none">
              {/* Einleitung */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Einleitung</h2>
                <p className="text-gray-700 mb-4">
                  Diese Datenschutzerklärung gilt für die Willi-Mako Chrome Extension zur automatischen 
                  Erkennung von Energiewirtschafts-Codes (MaLo, MeLo, EIC, BDEW) aus Screenshots. 
                  Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst und halten uns strikt an 
                  die Bestimmungen der Datenschutz-Grundverordnung (DSGVO).
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Verantwortlicher:</h3>
                  <p className="text-green-700">
                    STROMDAO GmbH<br />
                    Gerhard-Koch-Straße 2-4<br />
                    73760 Ostfildern<br />
                    Deutschland<br />
                    E-Mail: datenschutz@stromhaltig.de
                  </p>
                </div>
              </section>

              {/* Zweck der Extension */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Zweck der Extension</h2>
                <p className="text-gray-700 mb-4">
                  Die Willi-Mako Chrome Extension dient <strong>ausschließlich</strong> der automatischen 
                  Erkennung und Extraktion von deutschen Energiewirtschafts-Codes aus Screenshots:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>MaLo</strong> - Marktlokations-Identifikationsnummern</li>
                  <li><strong>MeLo</strong> - Messlokations-Identifikationsnummern</li>
                  <li><strong>EIC</strong> - Energy Identification Codes</li>
                  <li><strong>BDEW</strong> - Code-Nummern des Bundesverbands der Energie- und Wasserwirtschaft</li>
                </ul>
                <p className="text-gray-700">
                  Die Extension führt <strong>keine anderen Funktionen</strong> aus und sammelt keine 
                  persönlichen Daten außerhalb dieses spezifischen Anwendungszwecks.
                </p>
              </section>

              {/* Berechtigungen */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Erforderliche Browser-Berechtigungen</h2>
                
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">"activeTab" Berechtigung</h3>
                    <p className="text-gray-700 mb-2"><strong>Zweck:</strong> Screenshot-Aufnahme der aktuellen Browser-Seite</p>
                    <p className="text-gray-700 mb-2"><strong>Verwendung:</strong> Ermöglicht der Extension, Screenshots des aktiven Browser-Tabs zu erstellen</p>
                    <p className="text-gray-700"><strong>Datenschutz:</strong> Zugriff erfolgt nur bei expliziter Benutzeraktion, Screenshots werden nicht gespeichert</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">"storage" Berechtigung</h3>
                    <p className="text-gray-700 mb-2"><strong>Zweck:</strong> Lokale Speicherung von Extension-Einstellungen</p>
                    <p className="text-gray-700 mb-2"><strong>Verwendung:</strong> Speichert nur technische Konfigurationsdaten wie API-Endpoint-Einstellungen</p>
                    <p className="text-gray-700"><strong>Datenschutz:</strong> Keine persönlichen Daten, nur Funktionseinstellungen</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">"contextMenus" Berechtigung</h3>
                    <p className="text-gray-700 mb-2"><strong>Zweck:</strong> Integration ins Browser-Kontextmenü</p>
                    <p className="text-gray-700 mb-2"><strong>Verwendung:</strong> Fügt "Mit Willi-Mako analysieren" Menüeintrag hinzu</p>
                    <p className="text-gray-700"><strong>Datenschutz:</strong> Keine Datensammlung, nur Interface-Erweiterung</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">"notifications" Berechtigung</h3>
                    <p className="text-gray-700 mb-2"><strong>Zweck:</strong> Benutzerbenachrichtigungen</p>
                    <p className="text-gray-700 mb-2"><strong>Verwendung:</strong> Zeigt Statusmeldungen und Analyseergebnisse an</p>
                    <p className="text-gray-700"><strong>Datenschutz:</strong> Nur technische Meldungen, keine sensiblen Daten</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Host-Berechtigung "https://stromhaltig.de/*"</h3>
                    <p className="text-gray-700 mb-2"><strong>Zweck:</strong> API-Kommunikation für Screenshot-Analyse</p>
                    <p className="text-gray-700 mb-2"><strong>Verwendung:</strong> Sendet Screenshots zur KI-basierten Code-Erkennung an unsere Server</p>
                    <p className="text-gray-700"><strong>Datenschutz:</strong> Verschlüsselte HTTPS-Übertragung, Screenshots werden nach Analyse sofort gelöscht</p>
                  </div>
                </div>
              </section>

              {/* Datenverarbeitung */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Datenverarbeitung</h2>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4.1 Screenshots</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Screenshots werden nur bei expliziter Benutzeraktion erstellt</li>
                  <li>Übertragung erfolgt verschlüsselt via HTTPS an unsere Server</li>
                  <li>Screenshots werden nach der Analyse <strong>sofort gelöscht</strong></li>
                  <li>Keine dauerhafte Speicherung von Bildmaterial</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 mb-3">4.2 Analyseergebnisse</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Erkannte Codes werden temporär zur Anzeige gespeichert</li>
                  <li>Analysedaten werden nicht dauerhaft auf unseren Servern gespeichert</li>
                  <li>BDEW-Marktpartner-Informationen stammen aus öffentlichen Datenbanken</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900 mb-3">4.3 Technische Daten</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Extension-Einstellungen werden lokal im Browser gespeichert</li>
                  <li>Keine Übertragung von Browser-Verlauf oder anderen Webseitendaten</li>
                  <li>Keine Cookies oder Tracking-Mechanismen</li>
                </ul>
              </section>

              {/* Rechtsgrundlage */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Rechtsgrundlage</h2>
                <p className="text-gray-700 mb-4">
                  Die Verarbeitung Ihrer Daten erfolgt auf Grundlage von:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Art. 6 Abs. 1 lit. a DSGVO</strong> - Einwilligung durch Installation und Nutzung der Extension</li>
                  <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong> - Berechtigtes Interesse zur Bereitstellung der gewünschten Analysefunktion</li>
                </ul>
              </section>

              {/* Ihre Rechte */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Ihre Rechte</h2>
                <p className="text-gray-700 mb-4">
                  Sie haben folgende Rechte bezüglich Ihrer Daten:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO)</li>
                  <li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO)</li>
                  <li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO)</li>
                  <li><strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
                  <li><strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
                  <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO)</li>
                </ul>
                <p className="text-gray-700">
                  Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: <strong>datenschutz@stromhaltig.de</strong>
                </p>
              </section>

              {/* Datensicherheit */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Datensicherheit</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Sicherheitsmaßnahmen:</h3>
                  <ul className="list-disc list-inside text-blue-700 space-y-1">
                    <li>Verschlüsselte Datenübertragung (HTTPS/TLS)</li>
                    <li>Minimale Datensammlung (Privacy by Design)</li>
                    <li>Sofortige Löschung nach Verarbeitung</li>
                    <li>Keine dauerhafte Speicherung von Bilddaten</li>
                    <li>Regelmäßige Sicherheitsüberprüfungen</li>
                  </ul>
                </div>
              </section>

              {/* Änderungen */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Änderungen dieser Datenschutzerklärung</h2>
                <p className="text-gray-700 mb-4">
                  Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf zu aktualisieren. 
                  Die jeweils aktuelle Version finden Sie immer unter dieser Adresse. 
                  Wesentliche Änderungen werden wir über die Extension oder unsere Website kommunizieren.
                </p>
                <p className="text-gray-700">
                  <strong>Stand:</strong> August 2025
                </p>
              </section>

              {/* Kontakt */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Kontakt</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 mb-2">
                    <strong>Bei Fragen zum Datenschutz:</strong>
                  </p>
                  <p className="text-gray-700">
                    E-Mail: datenschutz@stromhaltig.de<br />
                    Telefon: +49 (0) 711 21957006<br />
                    Web: <Link href="https://stromhaltig.de" className="text-green-600 hover:text-green-700">https://stromhaltig.de</Link>
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.69 2.21L4.33 11.49c-.64.58-.28 1.65.58 1.73L8 13.64V20c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-6.36l3.09-.42c.86-.08 1.22-1.15.58-1.73L9.31 2.21c-.41-.37-1.02-.37-1.43 0z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">Stromhaltig</div>
                  <div className="text-sm text-gray-400">STROMDAO GmbH</div>
                </div>
              </div>
              
              <div className="flex space-x-6">
                <Link href="/chrome-extension" className="hover:text-white transition-colors">
                  Chrome Extension
                </Link>
                <Link href="/imprint" className="hover:text-white transition-colors">
                  Impressum
                </Link>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Datenschutz
                </Link>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-6 pt-6 text-center">
              <p className="text-gray-400">
                © 2024 STROMDAO GmbH. Alle Rechte vorbehalten.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
