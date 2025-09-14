import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import MongoDBConnection from '../../config/mongodb';
import type { ConsultationSubmission, PublicSubmissionDTO, SubmissionStatus } from './interfaces';

const COLLECTION = 'consultation_submissions';

export class ConsultationSubmissionsRepository {
  private db: Db | null = null;
  private collection: Collection<ConsultationSubmission> | null = null;

  private async ensure(): Promise<void> {
    if (!this.db) {
      this.db = await MongoDBConnection.getInstance().connect();
    }
    if (!this.collection) {
      this.collection = this.db.collection<ConsultationSubmission>(COLLECTION);
      // Minimal indexes
      await this.collection.createIndex({ slug: 1, chapterKey: 1, createdAt: -1 });
      await this.collection.createIndex({ published: 1 });
  await this.collection.createIndex({ status: 1 });
  await this.collection.createIndex({ slug: 1, published: 1, status: 1 });
    }
  }

  public async create(input: Omit<ConsultationSubmission, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'published'> & Partial<Pick<ConsultationSubmission, 'status' | 'published'>>): Promise<ConsultationSubmission> {
    await this.ensure();
    const now = new Date().toISOString();
    const doc: ConsultationSubmission = {
      slug: input.slug,
      chapterKey: input.chapterKey,
      author: input.author,
      organization: input.organization,
      contact: input.contact,
      comment: input.comment,
      curatedOpinion: input.curatedOpinion ?? null,
      curatedSummary: input.curatedSummary,
      createdAt: now,
      updatedAt: now,
      status: input.status ?? 'pending',
      published: input.published ?? false,
    };
    const result = await this.collection!.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  public async getPublicBySlug(slug: string, limit = 50): Promise<PublicSubmissionDTO[]> {
    await this.ensure();
    const cursor = this.collection!.find({ slug, published: true }).sort({ createdAt: -1 }).limit(Math.min(200, Math.max(1, limit)));
    const docs = await cursor.toArray();
    return docs.map(this.toPublicDTO);
  }

  public async getPublicBySlugAndChapter(slug: string, chapterKey: string, limit = 50): Promise<PublicSubmissionDTO[]> {
    await this.ensure();
    const cursor = this.collection!.find({ slug, chapterKey, published: true }).sort({ createdAt: -1 }).limit(Math.min(200, Math.max(1, limit)));
    const docs = await cursor.toArray();
    return docs.map(this.toPublicDTO);
  }

  public async getPublicById(id: string): Promise<PublicSubmissionDTO | null> {
    await this.ensure();
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.collection!.findOne({ _id: new ObjectId(id), published: true } as any);
    return doc ? this.toPublicDTO(doc) : null;
  }

  // Admin: list all (including unpublished) with filters
  public async listAll(slug: string, options?: {
    status?: SubmissionStatus | 'all';
    published?: boolean;
    chapterKey?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConsultationSubmission[]> {
    await this.ensure();
    const query: any = { slug };
    if (typeof options?.published === 'boolean') query.published = options.published;
    if (options?.status && options.status !== 'all') query.status = options.status;
    if (options?.chapterKey) query.chapterKey = options.chapterKey;
    if (options?.q) {
      const rx = new RegExp(options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { comment: rx },
        { author: rx },
        { organization: rx },
      ];
    }
    const limit = Math.min(200, Math.max(1, options?.limit ?? 50));
    const offset = Math.max(0, options?.offset ?? 0);
    const cursor = this.collection!.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit);
    return cursor.toArray();
  }

  public async getById(id: string): Promise<ConsultationSubmission | null> {
    await this.ensure();
    if (!ObjectId.isValid(id)) return null;
    return this.collection!.findOne({ _id: new ObjectId(id) } as any);
  }

  public async updateById(id: string, patch: Partial<Pick<ConsultationSubmission, 'status' | 'published' | 'curatedSummary' | 'curatedOpinion'>>): Promise<ConsultationSubmission | null> {
    await this.ensure();
    if (!ObjectId.isValid(id)) return null;
    const $set: any = { updatedAt: new Date().toISOString() };
    if (typeof patch.status !== 'undefined') $set.status = patch.status;
    if (typeof patch.published !== 'undefined') $set.published = patch.published;
    if (typeof patch.curatedSummary !== 'undefined') $set.curatedSummary = patch.curatedSummary;
    if (typeof patch.curatedOpinion !== 'undefined') $set.curatedOpinion = patch.curatedOpinion;
    await this.collection!.updateOne({ _id: new ObjectId(id) } as any, { $set });
    return this.collection!.findOne({ _id: new ObjectId(id) } as any);
  }

  public async deleteById(id: string): Promise<boolean> {
    await this.ensure();
    if (!ObjectId.isValid(id)) return false;
    const res = await this.collection!.deleteOne({ _id: new ObjectId(id) } as any);
    return (res.deletedCount || 0) > 0;
  }

  private toPublicDTO = (doc: ConsultationSubmission): PublicSubmissionDTO => ({
    id: String((doc as any)._id || ''),
    slug: doc.slug,
    chapterKey: doc.chapterKey,
    author: doc.author,
    organization: doc.organization,
    comment: doc.comment,
    createdAt: doc.createdAt,
    curatedSummary: doc.curatedSummary,
    curatedOpinion: doc.curatedOpinion ?? null,
  });
}
