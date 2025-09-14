import { Pool } from 'pg';
import { CommunityThread } from '../types/community';
export interface CommunityThreadPublication {
    id: string;
    thread_id: string;
    slug: string;
    title: string;
    summary: string;
    published_content: any;
    source_thread_updated_at: string;
    published_by_user_id: string;
    published_at: string;
    is_public: boolean;
}
export declare class CommunityPublicationRepository {
    private db;
    constructor(db: Pool);
    private ensured;
    private ensureTable;
    createPublication(input: {
        thread: CommunityThread;
        slug: string;
        title?: string;
        summary?: string;
        publishedByUserId: string;
    }): Promise<CommunityThreadPublication>;
    getBySlug(slug: string): Promise<CommunityThreadPublication | null>;
    listByThread(threadId: string): Promise<CommunityThreadPublication[]>;
    listAllPublic(): Promise<Pick<CommunityThreadPublication, 'slug' | 'title' | 'published_at' | 'source_thread_updated_at'>[]>;
    private map;
}
//# sourceMappingURL=CommunityPublicationRepository.d.ts.map