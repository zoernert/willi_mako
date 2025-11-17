import React, { useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
	Container, 
	Typography, 
	Box, 
	Button, 
	TextField, 
	Alert, 
	CircularProgress, 
	Paper,
	FormGroup,
	FormControlLabel,
	Checkbox,
	Radio,
	RadioGroup,
	FormControl,
	FormLabel,
	FormHelperText
} from '@mui/material';
import Link from 'next/link';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { getAllWhitepapers, getWhitepaperBySlug, getWhitepaperSlugs, Whitepaper as WP } from '../../lib/content/whitepapers';
import { getArticlesByWhitepaperSlug, Article } from '../../lib/content/articles';
import Layout from '../../components/Layout';
import { trackEvent, AnalyticsEvents } from '../../lib/analytics';
import type { DownloadReason, UsagePurpose, ContactPreference } from '../../types/whitepaper-lead';

interface WhitepaperDetailProps {
	whitepaper: WP;
	articles: Article[];
}

const WhitepaperDetailPage: React.FC<WhitepaperDetailProps> = ({ whitepaper, articles }) => {
	const router = useRouter();
	const [email, setEmail] = useState<string>('');
	const [downloadReasons, setDownloadReasons] = useState<DownloadReason[]>([]);
	const [usagePurpose, setUsagePurpose] = useState<UsagePurpose | ''>('');
	const [contactPreferences, setContactPreferences] = useState<ContactPreference[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

	const downloadReasonOptions: DownloadReason[] = [
		'Anderes Interesse',
		'Unternehmensentwicklung',
		'Energieforschung',
		'Strategieberatung',
		'Softwareentwicklung',
		'Medienmeldung',
		'Wissensmanagement'
	];

	const usagePurposeOptions: UsagePurpose[] = [
		'Persönliches Lesen',
		'Aufbereitung in Studie/Forschung',
		'Evaluation',
		'Verteilung an Kollegen/Peers',
		'Forschung und Lehre'
	];

	const contactPreferenceOptions: ContactPreference[] = [
		'Newsletter (ca. 1x/Monat)',
		'Bilaterale Email Beratung/Schulung',
		'Bilaterale Evaluation Whitepaper'
	];

	const handleDownloadReasonChange = (reason: DownloadReason) => {
		setDownloadReasons(prev => 
			prev.includes(reason) 
				? prev.filter(r => r !== reason)
				: [...prev, reason]
		);
	};

	const handleContactPreferenceChange = (preference: ContactPreference) => {
		setContactPreferences(prev => 
			prev.includes(preference) 
				? prev.filter(p => p !== preference)
				: [...prev, preference]
		);
	};

	const handleDownloadRequest = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Validation
		if (downloadReasons.length === 0) {
			setMessage({ type: 'error', text: 'Bitte wählen Sie mindestens einen Grund für den Download aus.' });
			return;
		}
		if (!usagePurpose) {
			setMessage({ type: 'error', text: 'Bitte wählen Sie den Zweck der Nutzung aus.' });
			return;
		}
		if (contactPreferences.length === 0) {
			setMessage({ type: 'error', text: 'Bitte wählen Sie mindestens eine Kontaktpräferenz aus.' });
			return;
		}

		setLoading(true);
		setMessage(null);
		setDownloadUrl(null);
		
		try {
			const response = await fetch('/api/send-whitepaper', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					whitepaperTitle: whitepaper.title,
					whitepaperPdfUrl: whitepaper.pdfPath,
					downloadReasons,
					usagePurpose,
					contactPreferences,
				}),
			});
			const data = await response.json();
			
			if (response.ok) {
				setMessage({ type: 'success', text: 'Vielen Dank! Sie erhalten in Kürze eine E-Mail mit dem Download-Link.' });
				setDownloadUrl(whitepaper.pdfPath);
				setEmail('');
				setDownloadReasons([]);
				setUsagePurpose('');
				setContactPreferences([]);
				
				// Track qualified lead event
				trackEvent(AnalyticsEvents.WHITEPAPER_LEAD_QUALIFIED, {
					whitepaper_slug: whitepaper.slug,
					whitepaper_title: whitepaper.title,
					download_reasons: downloadReasons.join(', '),
					usage_purpose: usagePurpose,
					contact_preferences: contactPreferences.join(', '),
				});
			} else {
				setMessage({ type: 'error', text: data.error || 'Fehler beim Senden des Whitepapers.' });
			}
		} catch (error) {
			console.error('Download request failed:', error);
			setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' });
		} finally {
			setLoading(false);
		}
	};

	if (!whitepaper) {
		return (
			<Container maxWidth="lg">
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
					<Alert severity="error">Whitepaper nicht gefunden.</Alert>
				</Box>
			</Container>
		);
	}

	return (
		<Layout title={whitepaper.seoTitle || whitepaper.title}>
		<Container maxWidth="lg">
			<Head>
				<title>{whitepaper.seoTitle || whitepaper.title}</title>
				<meta name="description" content={whitepaper.seoDescription || whitepaper.description} />
				{whitepaper.canonicalUrl && <link rel="canonical" href={whitepaper.canonicalUrl} />}
			</Head>
			<Box sx={{ py: 4 }}>
				<Box sx={{ mb: 4 }}>
					<Button
						variant="outlined"
						onClick={() => router.push('/whitepaper')}
						startIcon={<BackIcon />}
						sx={{ mb: 2, borderColor: '#147a50', color: '#147a50' }}
					>
						Zurück zu den Whitepapern
					</Button>
					<Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
						{whitepaper.title}
					</Typography>
					<Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
						Veröffentlicht: {new Date(whitepaper.publishedDate).toLocaleDateString('de-DE')}
					</Typography>
					<Typography variant="body1" paragraph>
						{whitepaper.description}
					</Typography>
				</Box>

				<Paper sx={{ p: 4, mb: 4 }}>
					<Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
						Whitepaper herunterladen
					</Typography>
					
					<Alert severity="info" sx={{ mb: 3 }}>
						<Typography variant="body2">
							<strong>Hinweis:</strong> Dieses Whitepaper ist für Gewerbekunden (B2B) konzipiert. 
							Privatpersonen bitten wir, eine E-Mail an <a href="mailto:kontakt@stromdao.com" style={{ color: '#147a50' }}>kontakt@stromdao.com</a> zu senden, 
							wenn Sie eine Kopie des Whitepapers wünschen.
						</Typography>
					</Alert>

					<Typography variant="body1" paragraph>
						Bitte füllen Sie die folgenden Angaben aus, um das Whitepaper herunterzuladen. 
						Sie erhalten anschließend eine E-Mail mit dem Download-Link.
					</Typography>

					<Box component="form" onSubmit={handleDownloadRequest} sx={{ mt: 3 }}>
						<TextField
							label="Ihre E-Mail-Adresse"
							type="email"
							fullWidth
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							sx={{ mb: 3 }}
						/>

						<FormControl component="fieldset" required sx={{ mb: 3, width: '100%' }}>
							<FormLabel component="legend" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
								Warum möchten Sie dieses Whitepaper herunterladen? (Mehrfachauswahl möglich)
							</FormLabel>
							<FormGroup>
								{downloadReasonOptions.map((reason) => (
									<FormControlLabel
										key={reason}
										control={
											<Checkbox
												checked={downloadReasons.includes(reason)}
												onChange={() => handleDownloadReasonChange(reason)}
												sx={{ 
													color: '#147a50',
													'&.Mui-checked': { color: '#147a50' }
												}}
											/>
										}
										label={reason}
									/>
								))}
							</FormGroup>
							{downloadReasons.length === 0 && (
								<FormHelperText>Bitte wählen Sie mindestens eine Option aus.</FormHelperText>
							)}
						</FormControl>

						<FormControl component="fieldset" required sx={{ mb: 3, width: '100%' }}>
							<FormLabel component="legend" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
								Für welchen Zweck werden Sie das Whitepaper nutzen?
							</FormLabel>
							<RadioGroup
								value={usagePurpose}
								onChange={(e) => setUsagePurpose(e.target.value as UsagePurpose)}
							>
								{usagePurposeOptions.map((purpose) => (
									<FormControlLabel
										key={purpose}
										value={purpose}
										control={
											<Radio 
												sx={{ 
													color: '#147a50',
													'&.Mui-checked': { color: '#147a50' }
												}}
											/>
										}
										label={purpose}
									/>
								))}
							</RadioGroup>
							{!usagePurpose && (
								<FormHelperText>Bitte wählen Sie eine Option aus.</FormHelperText>
							)}
						</FormControl>

						<FormControl component="fieldset" required sx={{ mb: 3, width: '100%' }}>
							<FormLabel component="legend" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
								Wie möchten Sie von der STROMDAO GmbH kontaktiert werden? (Mehrfachauswahl möglich)
							</FormLabel>
							<FormGroup>
								{contactPreferenceOptions.map((preference) => (
									<FormControlLabel
										key={preference}
										control={
											<Checkbox
												checked={contactPreferences.includes(preference)}
												onChange={() => handleContactPreferenceChange(preference)}
												sx={{ 
													color: '#147a50',
													'&.Mui-checked': { color: '#147a50' }
												}}
											/>
										}
										label={preference}
									/>
								))}
							</FormGroup>
							{contactPreferences.length === 0 && (
								<FormHelperText>Bitte wählen Sie mindestens eine Option aus.</FormHelperText>
							)}
						</FormControl>

						<Button
							type="submit"
							variant="contained"
							disabled={loading}
							startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
							sx={{ backgroundColor: '#147a50', '&:hover': { backgroundColor: '#0d5538' } }}
						>
							{loading ? 'Wird gesendet...' : 'Whitepaper anfordern'}
						</Button>

						{message && (
							<Alert severity={message.type} sx={{ mt: 2 }}>
								{message.text}
							</Alert>
						)}
						{downloadUrl && (
							<Box sx={{ mt: 2 }}>
								<Button variant="outlined" color="success" href={downloadUrl} target="_blank" rel="noopener noreferrer">
									PDF jetzt herunterladen
								</Button>
							</Box>
						)}
					</Box>
				</Paper>

						{whitepaper.content && (
					<Paper sx={{ p: 4, mb: 4 }}>
						<div className="whitepaper-content">
							<MarkdownRenderer>{whitepaper.content}</MarkdownRenderer>
						</div>
					</Paper>
				)}

						{articles && articles.length > 0 && (
							<Paper sx={{ p: 4, mb: 4 }}>
								<Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
									Zugehörige Artikel
								</Typography>
								<Box component="ul" sx={{ pl: 3, m: 0 }}>
									{articles.map((a) => (
										<li key={a.slug}>
											<Link href={`/wissen/artikel/${a.slug}`}>{a.title}</Link>
										</li>
									))}
								</Box>
							</Paper>
						)}
			</Box>
		</Container>
		</Layout>
	);
};

export const getStaticPaths: GetStaticPaths = async () => {
	const paths = getWhitepaperSlugs().map((slug) => ({ params: { slug } }));
	// Use blocking fallback so newly added whitepapers (via filesystem/admin) are generated on first request
	return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
	const slug = params?.slug as string;
	const whitepaper = getWhitepaperBySlug(slug);
	if (!whitepaper) {
		return { notFound: true };
	}
	const articles = getArticlesByWhitepaperSlug(slug);
	return {
		props: { whitepaper, articles },
		revalidate: 60,
	};
};

export default WhitepaperDetailPage;