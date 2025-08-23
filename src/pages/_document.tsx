import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="de">
      <Head>
        {/* Plausible Analytics Tracking Code */}
        <script 
          defer 
          data-domain="stromhaltig.de" 
          src="https://stats.corrently.cloud/js/script.js"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
