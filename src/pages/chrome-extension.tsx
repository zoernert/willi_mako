import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function ChromeExtensionPage() {
  return (
    <>
      <Head>
        <title>Willi-Mako Chrome Extension - Screenshot-Analyse für Energiewirtschafts-Codes</title>
        <meta name="description" content="Installieren Sie die Willi-Mako Chrome Extension für automatische Extraktion von Energiewirtschafts-Codes aus Screenshots. MaLo, MeLo, EIC und BDEW Codes direkt im Browser analysieren." />
        <meta name="keywords" content="Chrome Extension, Energiewirtschaft, MaLo, MeLo, EIC, BDEW, Screenshot-Analyse, Browser-Extension" />
        <meta property="og:title" content="Willi-Mako Chrome Extension" />
        <meta property="og:description" content="Automatische Extraktion von Energiewirtschafts-Codes aus Screenshots direkt im Browser" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/chrome-extension" />
        
        {/* Chrome Extension related meta tags */}
        <link rel="chrome-webstore-item" href="https://chrome.google.com/webstore/detail/[EXTENSION_ID]" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <Link href="/screenshot-analysis" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Web-Version
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-16 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.69 2.21L4.33 11.49c-.64.58-.28 1.65.58 1.73L8 13.64V20c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-6.36l3.09-.42c.86-.08 1.22-1.15.58-1.73L9.31 2.21c-.41-.37-1.02-.37-1.43 0z"/>
                  </svg>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
                <span className="text-green-600">Willi-Mako</span><br />
                Chrome Extension
              </h1>
              
              <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
                Extrahieren Sie automatisch Energiewirtschafts-Codes aus Screenshots direkt in Ihrem Browser. 
                MaLo, MeLo, EIC und BDEW Codes mit KI-Power analysieren.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => window.open('https://chrome.google.com/webstore/detail/[EXTENSION_ID]', '_blank')}
                  className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg"
                >
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Zu Chrome hinzufügen
                </button>
                
                <Link 
                  href="/screenshot-analysis"
                  className="inline-flex items-center px-8 py-4 border border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Web-Version testen
                </Link>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Kostenlos • Keine Anmeldung erforderlich • Datenschutz-konform
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Funktionen der Extension
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                Alles was Sie für die Energiewirtschaft brauchen, direkt im Browser
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Screenshot-Aufnahme</h3>
                <p className="text-gray-600">
                  Erstellen Sie Screenshots direkt im Browser oder fügen Sie Bilder aus der Zwischenablage ein
                </p>
              </div>

              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">KI-Analyse</h3>
                <p className="text-gray-600">
                  Automatische Erkennung von MaLo, MeLo, EIC und BDEW Codes mit fortschrittlicher KI-Technologie
                </p>
              </div>

              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Schnelle Ergebnisse</h3>
                <p className="text-gray-600">
                  Erhalten Sie Analyseergebnisse in Sekunden mit detaillierten Marktpartner-Informationen
                </p>
              </div>

              <div className="text-center p-6 bg-yellow-50 rounded-xl">
                <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">BDEW-Integration</h3>
                <p className="text-gray-600">
                  Automatische Verknüpfung mit BDEW-Datenbank für vollständige Marktpartner-Informationen
                </p>
              </div>

              <div className="text-center p-6 bg-red-50 rounded-xl">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Datenschutz</h3>
                <p className="text-gray-600">
                  Ihre Screenshots werden sicher verarbeitet und nicht gespeichert - DSGVO-konform
                </p>
              </div>

              <div className="text-center p-6 bg-indigo-50 rounded-xl">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Offline-fähig</h3>
                <p className="text-gray-600">
                  Grundfunktionen auch ohne Internetverbindung verfügbar, perfekt für unterwegs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                So funktioniert es
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                In drei einfachen Schritten zu Ihren Energiewirtschafts-Codes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Extension installieren</h3>
                <p className="text-gray-600">
                  Installieren Sie die Willi-Mako Extension aus dem Chrome Web Store mit einem Klick
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Screenshot erstellen</h3>
                <p className="text-gray-600">
                  Klicken Sie auf das Extension-Icon und erstellen Sie einen Screenshot oder fügen Sie ein Bild ein
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Ergebnisse erhalten</h3>
                <p className="text-gray-600">
                  Erhalten Sie sofort die erkannten Codes mit vollständigen Marktpartner-Informationen
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Installation Guide */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Installation
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                Installieren Sie die Extension in wenigen Sekunden
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Chrome Web Store öffnen</h3>
                    <p className="text-gray-600">
                      Klicken Sie auf "Zu Chrome hinzufügen" um direkt zum Chrome Web Store zu gelangen
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Extension hinzufügen</h3>
                    <p className="text-gray-600">
                      Klicken Sie auf "Zu Chrome hinzufügen" und bestätigen Sie die Installation
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Extension verwenden</h3>
                    <p className="text-gray-600">
                      Klicken Sie auf das Willi-Mako Icon in der Browser-Leiste um zu starten
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Tipp</h4>
                    <p className="text-blue-800">
                      Pinnen Sie die Extension in Ihrer Browser-Leiste an, um schnell darauf zugreifen zu können. 
                      Verwenden Sie die Tastenkombination Ctrl+Shift+W für noch schnelleren Zugriff.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-green-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Bereit für effizientere Markt­kommunikation?
            </h2>
            <p className="mt-6 text-xl text-green-100">
              Installieren Sie die Willi-Mako Chrome Extension und sparen Sie Zeit bei der 
              Analyse von Energiewirtschafts-Codes.
            </p>
            <div className="mt-10">
              <button 
                onClick={() => window.open('https://chrome.google.com/webstore/detail/[EXTENSION_ID]', '_blank')}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-green-600 bg-white hover:bg-gray-50 transition-colors shadow-lg"
              >
                <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Jetzt kostenlos installieren
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.69 2.21L4.33 11.49c-.64.58-.28 1.65.58 1.73L8 13.64V20c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-6.36l3.09-.42c.86-.08 1.22-1.15.58-1.73L9.31 2.21c-.41-.37-1.02-.37-1.43 0z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">Stromhaltig</div>
                    <div className="text-sm text-gray-400">Willi Mako</div>
                  </div>
                </div>
                <p className="text-gray-400 max-w-md">
                  Die führende Plattform für Energiewirtschafts-Weiterbildung und 
                  Marktpartner-Kommunikation in Deutschland.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Links</h3>
                <ul className="space-y-2">
                  <li><Link href="/" className="hover:text-white transition-colors">Hauptanwendung</Link></li>
                  <li><Link href="/screenshot-analysis" className="hover:text-white transition-colors">Web-Version</Link></li>
                  <li><a href="https://github.com/stromhaltig/willi-mako" className="hover:text-white transition-colors">GitHub</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
                <ul className="space-y-2">
                  <li><a href="mailto:support@stromhaltig.de" className="hover:text-white transition-colors">Support</a></li>
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Datenschutz</Link></li>
                  <li><Link href="/imprint" className="hover:text-white transition-colors">Impressum</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
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
