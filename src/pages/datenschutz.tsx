import Head from 'next/head';
import { Typography, Paper, Box } from '@mui/material';
import Layout from '../components/Layout';

export default function Datenschutz() {
  return (
    <Layout title="Datenschutzerklärung">
      <Head>
        <title>Datenschutzerklärung | Stromhaltig - Willi Mako</title>
        <meta name="description" content="Datenschutzerklärung für Stromhaltig und die Willi Mako Anwendung gemäß DSGVO." />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Datenschutzerklärung
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            1. Datenschutz auf einen Blick
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Allgemeine Hinweise
          </Typography>
          <Typography paragraph>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten 
            passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie 
            persönlich identifiziert werden können.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Datenerfassung auf dieser Website
          </Typography>
          <Typography paragraph>
            <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten 
            können Sie dem Impressum dieser Website entnehmen.
          </Typography>

          <Typography paragraph>
            <strong>Wie erfassen wir Ihre Daten?</strong><br />
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z.B. um 
            Daten handeln, die Sie in ein Kontaktformular eingeben oder bei der Registrierung für die Willi Mako 
            Anwendung angeben.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            2. Hosting und Content Delivery Networks (CDN)
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Externes Hosting
          </Typography>
          <Typography paragraph>
            Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, 
            die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert. Hierbei kann es 
            sich v.a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, 
            Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            3. Allgemeine Hinweise und Pflichtinformationen
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Datenschutz
          </Typography>
          <Typography paragraph>
            Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre 
            personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie 
            dieser Datenschutzerklärung.
          </Typography>

          <Typography paragraph>
            Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene 
            Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende 
            Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir sie nutzen.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Hinweis zur verantwortlichen Stelle
          </Typography>
          <Typography paragraph>
            Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br /><br />
            STROMDAO GmbH<br />
            Gerhard Weiser Ring 29<br />
            69256 Mauer<br /><br />
            Telefon: +49 6226 968 009 0<br />
            E-Mail: info@stromdao.de
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Widerruf Ihrer Einwilligung zur Datenverarbeitung
          </Typography>
          <Typography paragraph>
            Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine 
            bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten 
            Datenverarbeitung bleibt vom Widerruf unberührt.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            4. Datenerfassung auf dieser Website
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Server-Log-Dateien
          </Typography>
          <Typography paragraph>
            Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, 
            die Ihr Browser automatisch an uns übermittelt. Dies sind:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Browsertyp und Browserversion</li>
            <li>verwendetes Betriebssystem</li>
            <li>Referrer URL</li>
            <li>Hostname des zugreifenden Rechners</li>
            <li>Uhrzeit der Serveranfrage</li>
            <li>IP-Adresse</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Registrierung auf dieser Website
          </Typography>
          <Typography paragraph>
            Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen der Willi Mako Anwendung zu nutzen. 
            Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des jeweiligen Angebotes oder Dienstes, 
            für den Sie sich registriert haben.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            5. Plugins und Tools
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Google Web Fonts (lokales Hosting)
          </Typography>
          <Typography paragraph>
            Diese Seite nutzt zur einheitlichen Darstellung von Schriftarten so genannte Web Fonts, die von Google 
            bereitgestellt werden. Die Google Fonts sind lokal installiert. Eine Verbindung zu Servern von Google 
            findet dabei nicht statt.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            6. Ihre Rechte
          </Typography>

          <Typography paragraph>
            Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten 
            personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser 
            Daten zu verlangen. Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit unter 
            der im Impressum angegebenen Adresse an uns wenden.
          </Typography>

          <Typography paragraph>
            Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
          </Typography>

          <Typography variant="body2" sx={{ mt: 4, fontStyle: 'italic' }}>
            Stand: {new Date().toLocaleDateString('de-DE')}
          </Typography>
        </Box>
      </Paper>
    </Layout>
  );
}
