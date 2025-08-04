import Head from 'next/head';
import { Typography, Paper, Box } from '@mui/material';
import Layout from '../components/Layout';

export default function Nutzungsbedingungen() {
  return (
    <Layout title="Nutzungsbedingungen">
      <Head>
        <title>Nutzungsbedingungen | Stromhaltig - Willi Mako</title>
        <meta name="description" content="Nutzungsbedingungen für die Stromhaltig Website und die Willi Mako Anwendung." />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Nutzungsbedingungen
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            1. Geltungsbereich
          </Typography>
          
          <Typography paragraph>
            Diese Nutzungsbedingungen regeln die Nutzung der Website "Stromhaltig" und der Anwendung "Willi Mako", 
            die von der STROMDAO GmbH ("wir", "uns", "unser") betrieben wird. Durch die Nutzung unserer Dienste 
            erklären Sie sich mit diesen Bedingungen einverstanden.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            2. Beschreibung des Dienstes
          </Typography>
          
          <Typography paragraph>
            "Willi Mako" ist ein Expertensystem für Marktkommunikation in der Energiewirtschaft. Es bietet:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>FAQ-Datenbank zu energiewirtschaftlichen Themen</li>
            <li>KI-gestützten Chat für Fachfragen</li>
            <li>Dokumentenmanagement</li>
            <li>Team-Collaboration-Features</li>
            <li>Wissensdatenbank mit BDEW- und EIC-Codes</li>
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            3. Registrierung und Nutzerkonto
          </Typography>

          <Typography paragraph>
            Für die Nutzung bestimmter Funktionen ist eine Registrierung erforderlich. Sie verpflichten sich:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Wahrheitsgemäße und vollständige Angaben zu machen</li>
            <li>Ihre Zugangsdaten vertraulich zu behandeln</li>
            <li>Uns umgehend über unbefugte Nutzung zu informieren</li>
            <li>Ihr Konto nicht an Dritte zu übertragen</li>
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            4. Nutzungsregeln
          </Typography>

          <Typography paragraph>
            Bei der Nutzung unserer Dienste ist es untersagt:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Rechtswidrige, schädliche oder beleidigende Inhalte zu übertragen</li>
            <li>Die technische Infrastruktur zu beeinträchtigen</li>
            <li>Sicherheitsvorkehrungen zu umgehen</li>
            <li>Spam oder unerwünschte Nachrichten zu versenden</li>
            <li>Urheberrechte oder andere Schutzrechte zu verletzen</li>
            <li>Falsche Identitäten vorzutäuschen</li>
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            5. Inhalte und geistiges Eigentum
          </Typography>

          <Typography paragraph>
            Die auf unserer Plattform bereitgestellten Inhalte (FAQ-Artikel, Datenbanken, Software) sind 
            urheberrechtlich geschützt. Sie dürfen diese Inhalte nur im Rahmen der bestimmungsgemäßen 
            Nutzung verwenden.
          </Typography>

          <Typography paragraph>
            Für von Ihnen eingestellte Inhalte gewähren Sie uns eine nicht-exklusive Lizenz zur Nutzung, 
            soweit dies für die Bereitstellung des Dienstes erforderlich ist.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            6. Verfügbarkeit und Änderungen
          </Typography>

          <Typography paragraph>
            Wir bemühen uns um eine hohe Verfügbarkeit unserer Dienste, können jedoch keine 100%ige 
            Verfügbarkeit garantieren. Wartungsarbeiten können zu temporären Einschränkungen führen.
          </Typography>

          <Typography paragraph>
            Wir behalten uns vor, die Funktionalität unserer Dienste zu ändern oder zu erweitern. 
            Über wesentliche Änderungen werden wir Sie rechtzeitig informieren.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            7. Haftung
          </Typography>

          <Typography paragraph>
            Unsere Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Für leichte Fahrlässigkeit 
            haften wir nur bei Verletzung wesentlicher Vertragspflichten. Die Haftung für Datenverlust ist 
            auf den typischen Wiederherstellungsaufwand begrenzt.
          </Typography>

          <Typography paragraph>
            Die in der Wissensdatenbank bereitgestellten Informationen dienen ausschließlich der Information 
            und ersetzen keine fachliche Beratung. Wir übernehmen keine Gewähr für die Vollständigkeit und 
            Richtigkeit der Informationen.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            8. Kündigung
          </Typography>

          <Typography paragraph>
            Sie können Ihr Nutzerkonto jederzeit löschen. Wir können Ihr Konto bei schwerwiegenden 
            Verstößen gegen diese Nutzungsbedingungen kündigen.
          </Typography>

          <Typography paragraph>
            Nach Beendigung der Nutzung werden Ihre personenbezogenen Daten gemäß unserer 
            Datenschutzerklärung behandelt.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            9. Datenschutz
          </Typography>

          <Typography paragraph>
            Der Schutz Ihrer persönlichen Daten ist uns wichtig. Details zur Datenverarbeitung finden Sie 
            in unserer Datenschutzerklärung.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            10. Schlussbestimmungen
          </Typography>

          <Typography paragraph>
            Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist Mannheim.
          </Typography>

          <Typography paragraph>
            Sollten einzelne Bestimmungen unwirksam sein, bleibt die Gültigkeit der übrigen Bestimmungen 
            unberührt.
          </Typography>

          <Typography paragraph>
            Wir behalten uns vor, diese Nutzungsbedingungen zu ändern. Über Änderungen werden wir Sie 
            rechtzeitig informieren.
          </Typography>

          <Typography variant="body2" sx={{ mt: 4, fontStyle: 'italic' }}>
            Stand: {new Date().toLocaleDateString('de-DE')}
          </Typography>
        </Box>
      </Paper>
    </Layout>
  );
}
