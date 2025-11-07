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
				<Paper sx={{ p: 4, mb: 4 }}>
					<div className="whitepaper-article-content">
						{/* Entferne MDX-Import Zeilen aus dem Content */}
						<MarkdownRenderer>
							{article.content
								.replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"]\s*$/gm, '')
								.replace(/<CTA(Top|Middle|Bottom)\s*\/>/g, '')}
						</MarkdownRenderer>
					</div>
				</Paper>
				
				{/* CTA am Ende des Artikels */}
				<Box sx={{ mb: 4 }}>
					<CTABottom articleSlug={article.slug} />
				</Box>
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