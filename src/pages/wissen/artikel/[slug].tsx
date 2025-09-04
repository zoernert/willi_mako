import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Typography, Box, Button, Paper, Alert } from '@mui/material';
import Link from 'next/link';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import { getAllArticles, getArticleBySlug, getArticleSlugs, Article } from '../../../lib/content/articles';
import { getWhitepaperBySlug } from '../../../lib/content/whitepapers';
import Layout from '../../../components/Layout';

interface ArticleDetailProps {
	article: Article;
	whitepaperTitle?: string;
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
				<Container maxWidth="lg">
			<Head>
				<title>{article.seoTitle || article.title}</title>
				<meta name="description" content={article.seoDescription || article.shortDescription} />
				{article.canonicalUrl && <link rel="canonical" href={article.canonicalUrl} />}
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
						<MarkdownRenderer>{article.content}</MarkdownRenderer>
					</div>
				</Paper>
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
	return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
	const slug = params?.slug as string;
	const article = getArticleBySlug(slug);
	if (!article) {
		return { notFound: true };
	}
	let whitepaperTitle: string | undefined;
	if (article.whitepaperSlug) {
		const wp = getWhitepaperBySlug(article.whitepaperSlug);
		whitepaperTitle = wp?.title;
	}
	return {
		props: { article, whitepaperTitle },
		revalidate: 60,
	};
};

export default ArticleDetailPage;