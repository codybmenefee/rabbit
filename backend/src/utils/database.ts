import mongoose from 'mongoose';
import { logger } from './logger';

interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(config: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    try {
      const defaultOptions: mongoose.ConnectOptions = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        ...config.options,
      };

      mongoose.set('strictQuery', false);

      await mongoose.connect(config.uri, defaultOptions);

      this.isConnected = true;
      logger.info('Successfully connected to MongoDB');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info('Database already disconnected');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Successfully disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{ status: string; database: string; readyState: number }> {
    try {
      const db = mongoose.connection.db;
      const adminDb = db.admin();
      const result = await adminDb.ping();
      
      return {
        status: 'connected',
        database: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'error',
        database: 'unknown',
        readyState: mongoose.connection.readyState
      };
    }
  }
}

export const database = DatabaseManager.getInstance();
export default database;