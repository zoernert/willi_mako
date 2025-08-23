import { StaticFAQData } from './faq-api';
export interface FAQMetadata {
    title: string;
    description: string;
    keywords: string;
    openGraph: {
        title: string;
        description: string;
        type: string;
        url: string;
    };
    twitter: {
        card: string;
        title: string;
        description: string;
    };
}
export declare function generateMetadata(faq: StaticFAQData): FAQMetadata;
export declare function generateFAQJSONLD(faq: StaticFAQData): {
    "@context": string;
    "@type": string;
    mainEntity: {
        "@type": string;
        name: string;
        acceptedAnswer: {
            "@type": string;
            text: string;
            author: {
                "@type": string;
                name: string;
                url: string;
            };
            dateCreated: string;
            dateModified: string;
        };
    };
    about: {
        "@type": string;
        name: string;
        sameAs: string[];
    };
    isPartOf: {
        "@type": string;
        name: string;
        description: string;
        license: string;
        publisher: {
            "@type": string;
            name: string;
            url: string;
        };
    };
    creator: {
        "@type": string;
        name: string;
        email: string;
    };
    keywords: string;
    datePublished: string;
    dateModified: string;
};
export declare function generateBreadcrumbJSONLD(faq: StaticFAQData, cluster?: string): {
    "@context": string;
    "@type": string;
    itemListElement: {
        "@type": string;
        position: number;
        name: string;
        item: string;
    }[];
    creator: {
        "@type": string;
        name: string;
        email: string;
    };
};
export declare function calculateSitemapPriority(viewCount: number, tags: string[]): string;
export declare function calculateChangeFreq(viewCount: number): string;
export declare function generateRSSItem(faq: StaticFAQData): string;
export declare function generateAtomEntry(faq: StaticFAQData): string;
//# sourceMappingURL=seo-utils.d.ts.map