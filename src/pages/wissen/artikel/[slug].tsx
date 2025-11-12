import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { Container, Typography, Box, Button, Paper, Alert } from '@mui/material';
import Link from 'next/link';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import { getAllArticles, getArticleBySlug, getArticleSlugs, Article } from '../../../lib/content/articles';
import { getWhitepaperBySlug } from '../../../lib/content/whitepapers';
import Layout from '../../../components/Layout';
import { ArticleSEO } from '../../../components/ArticleSEO';
import { CTATop, CTAMiddle, CTABottom } from '../../../components/ArticleCTA';

interface ArticleDetailProps {
	article: Article;
	whitepaperTitle?: string | null;
}

// Helper: Parse CTA components from content and split content into sections
interface CTAMatch {
	type: 'Top' | 'Middle' | 'Bottom';
	props: any;
	index: number;
	fullMatch: string;
}

function parseContentWithCTAs(content: string): { sections: string[]; ctas: CTAMatch[] } {
	// Remove import statements first
	let cleanContent = content.replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '');
	
	const ctas: CTAMatch[] = [];
	
	// Match CTA components including multi-line ones
	// Pattern: <CTA(Top|Middle|Bottom) ... /> or <CTA(Top|Middle|Bottom) ... >...</CTA...>
	const ctaRegex = /<CTA(Top|Middle|Bottom)\s+([\s\S]*?)\/>/g;
	let match;
	
	while ((match = ctaRegex.exec(cleanContent)) !== null) {
		const type = match[1] as 'Top' | 'Middle' | 'Bottom';
		const propsString = match[2];
		const fullMatch = match[0];
		
		// Parse props (improved extraction)
		const props: any = {};
		
		// Extract articleSlug
		const articleSlugMatch = propsString.match(/articleSlug=["']([^"']+)["']/);
		if (articleSlugMatch) props.articleSlug = articleSlugMatch[1];
		
		// Extract processName
		const processNameMatch = propsString.match(/processName=["']([^"']+)["']/);
		if (processNameMatch) props.processName = processNameMatch[1];
		
		// Extract screenshotUrl
		const screenshotMatch = propsString.match(/screenshotUrl=["']([^"']+)["']/);
		if (screenshotMatch) props.screenshotUrl = screenshotMatch[1];
		
		// Extract screenshotAlt
		const screenshotAltMatch = propsString.match(/screenshotAlt=["']([^"']+)["']/);
		if (screenshotAltMatch) props.screenshotAlt = screenshotAltMatch[1];
		
		// Extract relatedArticles (complex array)
		const relatedArticlesMatch = propsString.match(/relatedArticles=\{(\[[\s\S]*?\])\}/);
		if (relatedArticlesMatch) {
			try {
				// Clean up JSX formatting to valid JSON
				const jsonStr = relatedArticlesMatch[1]
					.replace(/(\w+):/g, '"$1":') // Quote keys
					.replace(/:\s*"([^"]+)"/g, ': "$1"') // Already quoted values are fine
					.replace(/,\s*}/g, '}') // Remove trailing commas
					.replace(/,\s*]/g, ']');
				props.relatedArticles = JSON.parse(jsonStr);
			} catch (e) {
				console.warn('Failed to parse relatedArticles:', e);
			}
		}
		
		ctas.push({
			type,
			props,
			index: match.index,
			fullMatch,
		});
	}
	
	// Split content at CTA positions
	const sections: string[] = [];
	let lastIndex = 0;
	
	ctas.forEach((cta) => {
		sections.push(cleanContent.slice(lastIndex, cta.index));
		lastIndex = cta.index + cta.fullMatch.length;
	});
	
	// Add remaining content
	sections.push(cleanContent.slice(lastIndex));
	
	// Clean up sections - trim whitespace and filter empty ones
	const cleanSections = sections
		.map(s => s.trim())
		.filter(s => s.length > 0);
	
	return { sections: cleanSections, ctas };
}

const ArticleDetailPage: React.FC<ArticleDetailProps> = ({ article, whitepaperTitle }) => {
	const router = useRouter();
	
	if (!article) {
		return (
			<Layout title="Artikel nicht gefunden">
				<Container maxWidth="lg">
					<Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
						<Alert severity="error">Artikel nicht gefunden.</Alert>
					</Box>
				</Container>
			</Layout>
		);
	}
	
	// Parse content and extract CTAs
	const { sections, ctas } = parseContentWithCTAs(article.content);
	
	return (
		<Layout title={article.seoTitle || article.title}>
			<ArticleSEO
				title={article.title}
				description={(article as any).description || (article as any).excerpt || article.shortDescription}
				canonical={`/articles/${article.slug}`}
				publishedTime={(article as any).date || article.publishedDate}
				modifiedTime={(article as any).modifiedDate}
				tags={(article as any).tags || []}
			/>
			<Container maxWidth="lg">
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
							{article.title}
						</Typography>
						<Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
							Veröffentlicht: {new Date(article.publishedDate).toLocaleDateString('de-DE')}
						</Typography>
						<Typography variant="body1" paragraph>
							{article.shortDescription}
						</Typography>
					</Box>
					
					{/* Render content sections with CTAs */}
					{sections.map((section, index) => (
						<React.Fragment key={index}>
							{section && (
								<Paper sx={{ p: 4, mb: 4 }}>
									<div className="whitepaper-article-content">
										<MarkdownRenderer>{section}</MarkdownRenderer>
									</div>
								</Paper>
							)}
							
							{/* Render CTA if exists for this position */}
							{ctas[index] && (
								<Box sx={{ mb: 4 }}>
									{ctas[index].type === 'Top' && <CTATop {...ctas[index].props} />}
									{ctas[index].type === 'Middle' && <CTAMiddle {...ctas[index].props} />}
									{ctas[index].type === 'Bottom' && <CTABottom {...ctas[index].props} />}
								</Box>
							)}
						</React.Fragment>
					))}
					
					<Box sx={{ mb: 4 }}>
						<Typography variant="body2" color="text.secondary">
							Praxisleitfaden gesucht? Besuchen Sie das{' '}
							<Link href="/benutzerhandbuch" style={{ textDecoration: 'underline' }}>Benutzerhandbuch</Link>.
						</Typography>
					</Box>
					
					{article.whitepaperSlug && (
						<Box sx={{ mt: 4 }}>
							<Typography variant="h6" component="h2" gutterBottom>
								Dieser Artikel ist Teil unseres Whitepapers:
							</Typography>
							<Link href={`/whitepaper/${article.whitepaperSlug}`} passHref>
								<Button
									variant="contained"
									sx={{ backgroundColor: '#147a50', '&:hover': { backgroundColor: '#0d5538' } }}
								>
									{whitepaperTitle || 'Whitepaper ansehen'}
								</Button>
							</Link>
						</Box>
					)}
				</Box>
			</Container>
		</Layout>
	);
};

export const getStaticPaths: GetStaticPaths = async () => {
	const paths = getArticleSlugs().map((slug) => ({ params: { slug } }));
	// Use blocking to allow new articles to appear immediately after deploy, generated on first request
	return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
	const slug = params?.slug as string;
	const article = getArticleBySlug(slug);
	if (!article) {
		return { notFound: true };
	}
	
	// Serialisiere alle Date-Objekte zu ISO-Strings
	const serializedArticle: any = { ...article };
	['date', 'publishedDate', 'modifiedDate'].forEach(field => {
		if (serializedArticle[field] instanceof Date) {
			serializedArticle[field] = serializedArticle[field].toISOString();
		}
	});
	
	const props: { article: any; whitepaperTitle?: string | null } = { article: serializedArticle };
	if (article.whitepaperSlug) {
		const wp = getWhitepaperBySlug(article.whitepaperSlug);
		props.whitepaperTitle = wp?.title || null;
	}
	return {
		props,
		revalidate: 60,
	};
};

export default ArticleDetailPage;