import React from "react";
import { Container, Box, Typography, Paper } from "@mui/material";
import { ElectricBolt as ElectricBoltIcon, Info as InfoIcon } from "@mui/icons-material";
import CodeSearch from "../components/CodeLookup/CodeSearch";

const CodeLookupPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
          <ElectricBoltIcon sx={{ mr: 2, fontSize: 40 }} />
          Marktpartner Suche
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Finden Sie Marktpartner der Energiewirtschaft: Unternehmen, Marktrollen, BDEW-Codes, Software-Systeme und Kontaktdaten.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <CodeSearch />
        </Paper>

        <Paper sx={{ p: 3, backgroundColor: "background.default" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <InfoIcon sx={{ mr: 1, color: "primary.main" }} />
            <Typography variant="h6">
              Über Marktpartner & Codes
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Marktrollen & BDEW-Codes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Marktrollen (z.B. Lieferant, Netzbetreiber, Bilanzkreisverantwortlicher) und zugehörige BDEW-Codes identifizieren eindeutig die Funktionen eines Unternehmens in der Marktkommunikation.
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                EIC-Codes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Energy Identification Codes (EIC) sind europaweit eindeutige Kennungen für Teilnehmer und Objekte der Energiewirtschaft.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CodeLookupPage;
