import { Collection, Db } from 'mongodb';
import MongoDBConnection from '../../../config/mongodb';
import { SessionDocument } from '../../../domain/api-v2/session.types';
import { AppError } from '../../../middleware/errorHandler';

export interface SessionRepository {
  save(session: SessionDocument): Promise<SessionDocument>;
  findById(sessionId: string): Promise<SessionDocument | null>;
  delete(sessionId: string): Promise<void>;
}

export class MongoSessionRepository implements SessionRepository {
  private collection: Collection<SessionDocument> | null = null;
  private indexesEnsured = false;
  private collectionPromise: Promise<Collection<SessionDocument>> | null = null;
  private indexPromise: Promise<void> | null = null;

  constructor(private readonly collectionName: string = 'api_v2_sessions') {}

  private async getCollection(): Promise<Collection<SessionDocument>> {
    if (this.collection) {
      return this.collection;
    }

    const connection = MongoDBConnection.getInstance();
    if (this.collectionPromise) {
      return this.collectionPromise;
    }

    const promise = (async () => {
      try {
        const db: Db = await connection.connect();
        const collection = db.collection<SessionDocument>(this.collectionName);
        this.collection = collection;
        this.ensureIndexesInBackground(collection);
        return collection;
      } catch (error) {
        console.error('SessionRepository: failed to obtain collection:', error);
        const appError = new AppError('MongoDB ist aktuell nicht erreichbar. Bitte versuchen Sie es in Kürze erneut.', 503);
        (appError as any).context = {
          code: 'mongo_unavailable',
          error: error instanceof Error ? error.message : String(error || 'unknown')
        };
        throw appError;
      }
    })();

    this.collectionPromise = promise.finally(() => {
      this.collectionPromise = null;
    });

    return promise;
  }

  private ensureIndexesInBackground(collection: Collection<SessionDocument>): void {
    if (this.indexesEnsured || this.indexPromise) {
      return;
    }

    this.indexPromise = (async () => {
      try {
        const results = await Promise.allSettled([
          collection.createIndex({ sessionId: 1 }, { unique: true }),
          collection.createIndex({ userId: 1, sessionId: 1 }),
          collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        ]);

        const rejected = results.filter((result) => result.status === 'rejected');

        if (rejected.length) {
          console.warn('SessionRepository: index creation failed – continuing without indexes for now.', rejected.map((r) => (r.status === 'rejected' && r.reason) || 'unknown'));
          this.indexesEnsured = false;
        } else {
          this.indexesEnsured = true;
        }
      } catch (error) {
        console.error('SessionRepository: unexpected error while creating indexes:', error);
        this.indexesEnsured = false;
      } finally {
        this.indexPromise = null;
      }
    })();
  }

  public async save(session: SessionDocument): Promise<SessionDocument> {
    const collection = await this.getCollection();

    await collection.updateOne(
      { sessionId: session.sessionId },
      { $set: session },
      { upsert: true }
    );

    return session;
  }

  public async findById(sessionId: string): Promise<SessionDocument | null> {
    const collection = await this.getCollection();
    return collection.findOne({ sessionId });
  }

  public async delete(sessionId: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne({ sessionId });
  }
}
