import React, { useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Typography, Box, Button, TextField, Alert, CircularProgress, Paper } from '@mui/material';
import Link from 'next/link';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { getAllWhitepapers, getWhitepaperBySlug, getWhitepaperSlugs, Whitepaper as WP } from '../../lib/content/whitepapers';
import { getArticlesByWhitepaperSlug, Article } from '../../lib/content/articles';
import Layout from '../../components/Layout';

interface WhitepaperDetailProps {
	whitepaper: WP;
	articles: Article[];
}

const WhitepaperDetailPage: React.FC<WhitepaperDetailProps> = ({ whitepaper, articles }) => {
	const router = useRouter();
	const [email, setEmail] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

	const handleDownloadRequest = async (e: React.FormEvent) => {
		e.preventDefault();
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
				}),
			});
			const data = await response.json();
					if (response.ok) {
				setMessage({ type: 'success', text: data.message || 'Danke! Der Lead wurde übermittelt.' });
				setDownloadUrl(whitepaper.pdfPath);
				setEmail('');
						// Optional analytics hook (no-op if dataLayer not present)
						try {
							// @ts-ignore
							window.dataLayer?.push({
								event: 'whitepaper_lead_submitted',
								whitepaper_slug: whitepaper.slug,
								whitepaper_title: whitepaper.title,
							});
						} catch {}
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
					<Typography variant="body1" paragraph>
						Geben Sie Ihre E-Mail-Adresse ein. Nach dem Absenden können Sie das PDF direkt herunterladen.
					</Typography>
					<Box component="form" onSubmit={handleDownloadRequest} sx={{ mt: 2 }}>
						<TextField
							label="Ihre E-Mail-Adresse"
							type="email"
							fullWidth
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							sx={{ mb: 2 }}
						/>
						<Button
							type="submit"
							variant="contained"
							disabled={loading}
							startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
							sx={{ backgroundColor: '#147a50', '&:hover': { backgroundColor: '#0d5538' } }}
						>
							{loading ? 'Sende...' : 'Lead senden'}
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