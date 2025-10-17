import { MongoClient, Db, MongoClientOptions } from 'mongodb';

class MongoDBConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private static instance: MongoDBConnection;
  private connectingPromise: Promise<Db> | null = null;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }

  const maxAttempts = this.parsePositiveInt(process.env.MONGO_MAX_RETRIES, 5);
  const baseDelayMs = this.parsePositiveInt(process.env.MONGO_RETRY_DELAY_MS, 1500);
  const serverSelectionTimeoutMs = this.parsePositiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 7000);
  const socketTimeoutMs = this.parsePositiveInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 20000);
    const dbName = this.resolveDatabaseName(mongoUri);

    const options: MongoClientOptions = {
      serverSelectionTimeoutMS: serverSelectionTimeoutMs,
      connectTimeoutMS: serverSelectionTimeoutMs,
      socketTimeoutMS: socketTimeoutMs
    };

    this.connectingPromise = this.establishConnection({
      mongoUri,
      dbName,
      maxAttempts,
      baseDelayMs,
      options
    })
      .finally(() => {
        this.connectingPromise = null;
      });

    return this.connectingPromise;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  private async establishConnection(params: {
    mongoUri: string;
    dbName: string;
    maxAttempts: number;
    baseDelayMs: number;
    options: MongoClientOptions;
  }): Promise<Db> {
    const { mongoUri, dbName, maxAttempts, baseDelayMs, options } = params;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Connecting to MongoDB (attempt ${attempt}/${maxAttempts})...`);
        this.client = new MongoClient(mongoUri, options);
        await this.client.connect();
        const dbCandidate = this.client.db(dbName);

        try {
          await dbCandidate.command({ ping: 1 });
        } catch (pingError) {
          console.error('MongoDB ping failed after connect, will retry:', pingError);
          throw pingError;
        }

        this.db = dbCandidate;
        console.log('Connected to MongoDB successfully');
        return this.db;
      } catch (error) {
        console.error(`MongoDB connection error on attempt ${attempt}:`, error);
        await this.safeCloseClient();

        if (attempt >= maxAttempts) {
          throw error;
        }

  const delayMs = Math.min(baseDelayMs * attempt, 10_000);
        console.warn(`Retrying MongoDB connection in ${delayMs} ms...`);
        await this.delay(delayMs);
      }
    }

    throw new Error('Failed to establish MongoDB connection after retries');
  }

  private async safeCloseClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (closeError) {
        console.error('Error while closing MongoDB client after failure:', closeError);
      } finally {
        this.client = null;
        this.db = null;
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private resolveDatabaseName(uri: string): string {
    if (process.env.MONGO_DB_NAME && process.env.MONGO_DB_NAME.trim()) {
      return process.env.MONGO_DB_NAME.trim();
    }

    try {
      const withoutParams = uri.split('?')[0];
      const segments = withoutParams.split('/');
      const candidate = segments[segments.length - 1];
      if (candidate && !candidate.includes('@') && candidate.trim().length > 0) {
        return candidate.trim();
      }
    } catch (_error) {
      // noop - fallback below
    }

    return 'quitus';
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    return fallback;
  }
}

export default MongoDBConnection;
