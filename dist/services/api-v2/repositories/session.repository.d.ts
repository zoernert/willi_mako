import { SessionDocument } from '../../../domain/api-v2/session.types';
export interface SessionRepository {
    save(session: SessionDocument): Promise<SessionDocument>;
    findById(sessionId: string): Promise<SessionDocument | null>;
    delete(sessionId: string): Promise<void>;
}
export declare class MongoSessionRepository implements SessionRepository {
    private readonly collectionName;
    private collection;
    private indexesEnsured;
    private collectionPromise;
    private indexPromise;
    constructor(collectionName?: string);
    private getCollection;
    private ensureIndexesInBackground;
    save(session: SessionDocument): Promise<SessionDocument>;
    findById(sessionId: string): Promise<SessionDocument | null>;
    delete(sessionId: string): Promise<void>;
}
//# sourceMappingURL=session.repository.d.ts.map