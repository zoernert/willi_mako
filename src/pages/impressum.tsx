import Head from 'next/head';
import { Typography, Paper, Box } from '@mui/material';
import Layout from '../components/Layout';

export default function Impressum() {
  return (
    <Layout title="Impressum">
      <Head>
        <title>Impressum | Stromhaltig - Willi Mako</title>
        <meta name="description" content="Impressum und rechtliche Informationen zu Stromhaltig und der Willi Mako Anwendung." />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Impressum
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Angaben gemäß § 5 TMG
          </Typography>
          
          <Typography paragraph>
            <strong>STROMDAO GmbH</strong><br />
            Gerhard Weiser Ring 29<br />
            69256 Mauer<br />
            Deutschland
          </Typography>

          <Typography paragraph>
            <strong>Vertreten durch:</strong><br />
            Thorsten Zoerner, Geschäftsführer
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Kontakt
          </Typography>
          <Typography paragraph>
            Telefon: +49 6226 968 009 0<br />
            E-Mail: info@stromdao.de<br />
            Website: www.stromdao.de
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Registereintrag
          </Typography>
          <Typography paragraph>
            Eintragung im Handelsregister.<br />
            Registergericht: Amtsgericht Mannheim<br />
            Registernummer: HRB 728691
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Umsatzsteuer-ID
          </Typography>
          <Typography paragraph>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
            DE309675163
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </Typography>
          <Typography paragraph>
            Thorsten Zoerner<br />
            Gerhard Weiser Ring 29<br />
            69256 Mauer
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Streitschlichtung
          </Typography>
          <Typography paragraph>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
            https://ec.europa.eu/consumers/odr/. Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </Typography>
          
          <Typography paragraph>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
            Verbraucherschlichtungsstelle teilzunehmen.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Haftung für Inhalte
          </Typography>
          <Typography paragraph>
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
            allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht 
            unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach 
            Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Haftung für Links
          </Typography>
          <Typography paragraph>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
            Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten 
            Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Urheberrecht
          </Typography>
          <Typography paragraph>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen 
            Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der 
            Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </Typography>
        </Box>
      </Paper>
    </Layout>
  );
}
