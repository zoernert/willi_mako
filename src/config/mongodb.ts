import { MongoClient, Db } from 'mongodb';

class MongoDBConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private static instance: MongoDBConnection;

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

    try {
      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error('MONGO_URI environment variable is not set');
      }

      console.log('Connecting to MongoDB...');
      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      
      // Extract database name from URI or use default
      const dbName = 'quitus'; // Based on the URI in .env
      this.db = this.client.db(dbName);
      
      console.log('Connected to MongoDB successfully');
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
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
}

export default MongoDBConnection;
