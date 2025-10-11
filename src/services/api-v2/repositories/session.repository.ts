import { Collection, Db } from 'mongodb';
import MongoDBConnection from '../../../config/mongodb';
import { SessionDocument } from '../../../domain/api-v2/session.types';

export interface SessionRepository {
  save(session: SessionDocument): Promise<SessionDocument>;
  findById(sessionId: string): Promise<SessionDocument | null>;
  delete(sessionId: string): Promise<void>;
}

export class MongoSessionRepository implements SessionRepository {
  private collection: Collection<SessionDocument> | null = null;
  private indexesEnsured = false;

  constructor(private readonly collectionName: string = 'api_v2_sessions') {}

  private async getCollection(): Promise<Collection<SessionDocument>> {
    if (this.collection) {
      return this.collection;
    }

    const connection = MongoDBConnection.getInstance();
    const db: Db = await connection.connect();
    this.collection = db.collection<SessionDocument>(this.collectionName);

    if (!this.indexesEnsured) {
      await this.ensureIndexes();
    }

    return this.collection;
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.collection) {
      return;
    }

    await Promise.all([
      this.collection.createIndex({ sessionId: 1 }, { unique: true }),
      this.collection.createIndex({ userId: 1, sessionId: 1 }),
      this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);

    this.indexesEnsured = true;
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
