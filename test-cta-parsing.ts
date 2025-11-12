/**
 * Test script to verify CTA parsing from article content
 */

const testContent = `
import { CTATop, CTAMiddle, CTABottom } from '../../../components/ArticleCTA';

# Test Article

Some intro text here.

<CTATop articleSlug="test-article" processName="Test Process" />

## Main Section

More content here.

<CTAMiddle 
  articleSlug="test-article" 
  processName="Test Processing"
  screenshotUrl="/screenshots/test.png"
/>

## Final Section

Last content here.

<CTABottom 
  articleSlug="test-article"
  relatedArticles={[
    {
      slug: "article-1",
      title: "Article 1",
      excerpt: "Description 1"
    },
    {
      slug: "article-2",
      title: "Article 2",
      excerpt: "Description 2"
    }
  ]}
/>
`;

// Copy the parsing function from [slug].tsx
interface CTAMatch {
	type: 'Top' | 'Middle' | 'Bottom';
	props: any;
	index: number;
	fullMatch: string;
}

function parseContentWithCTAs(content: string): { sections: string[]; ctas: CTAMatch[] } {
	let cleanContent = content.replace(/^import\s+{[^}]+}\s+from\s+['"][^'"]+['"]\s*$/gm, '');
	
	const ctas: CTAMatch[] = [];
	const ctaRegex = /<CTA(Top|Middle|Bottom)\s+([\s\S]*?)\/>/g;
	let match;
	
	while ((match = ctaRegex.exec(cleanContent)) !== null) {
		const type = match[1] as 'Top' | 'Middle' | 'Bottom';
		const propsString = match[2];
		const fullMatch = match[0];
		
		const props: any = {};
		
		const articleSlugMatch = propsString.match(/articleSlug=["']([^"']+)["']/);
		if (articleSlugMatch) props.articleSlug = articleSlugMatch[1];
		
		const processNameMatch = propsString.match(/processName=["']([^"']+)["']/);
		if (processNameMatch) props.processName = processNameMatch[1];
		
		const screenshotMatch = propsString.match(/screenshotUrl=["']([^"']+)["']/);
		if (screenshotMatch) props.screenshotUrl = screenshotMatch[1];
		
		const screenshotAltMatch = propsString.match(/screenshotAlt=["']([^"']+)["']/);
		if (screenshotAltMatch) props.screenshotAlt = screenshotAltMatch[1];
		
		const relatedArticlesMatch = propsString.match(/relatedArticles=\{(\[[\s\S]*?\])\}/);
		if (relatedArticlesMatch) {
			try {
				const jsonStr = relatedArticlesMatch[1]
					.replace(/(\w+):/g, '"$1":')
					.replace(/:\s*"([^"]+)"/g, ': "$1"')
					.replace(/,\s*}/g, '}')
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
	
	const sections: string[] = [];
	let lastIndex = 0;
	
	ctas.forEach((cta) => {
		sections.push(cleanContent.slice(lastIndex, cta.index));
		lastIndex = cta.index + cta.fullMatch.length;
	});
	
	sections.push(cleanContent.slice(lastIndex));
	
	const cleanSections = sections.map(s => s.trim()).filter(s => s.length > 0);
	
	return { sections: cleanSections, ctas };
}

// Test it
console.log('Testing CTA parsing...\n');
const result = parseContentWithCTAs(testContent);

console.log(`Found ${result.ctas.length} CTAs:\n`);
result.ctas.forEach((cta, i) => {
	console.log(`CTA ${i + 1}: ${cta.type}`);
	console.log('Props:', JSON.stringify(cta.props, null, 2));
	console.log('');
});

console.log(`Content split into ${result.sections.length} sections:\n`);
result.sections.forEach((section, i) => {
	console.log(`Section ${i + 1} (${section.length} chars):`);
	console.log(section.substring(0, 100) + (section.length > 100 ? '...' : ''));
	console.log('');
});
