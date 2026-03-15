import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

/**
 * Global cache to prevent multiple connections in development
 * (Next.js hot-reloads re-import modules)
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      dbName: "user-account",
      // Connection timeout settings
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // Increased to 30 seconds
      // Retry settings
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      // Additional DNS and connection options
      family: 4, // Force IPv4
      directConnection: false,
      ssl: true,
      authSource: 'admin',
    };

    cached.promise = mongoose.connect(MONGODB_URI, options);
  }

  try {
    cached.conn = await cached.promise;
    console.log('[MongoDB] Connected successfully');
    return cached.conn;
  } catch (e: any) {
    cached.promise = null;
    console.error('[MongoDB] Connection failed:', e.message);
    
    // Provide more specific error messages
    if (e.message.includes('ECONNREFUSED') || e.message.includes('querySrv')) {
      console.error('[MongoDB] DNS/Network Error:', e.message);
      
      // Check if it's a DNS resolution issue
      if (e.message.includes('querySrv')) {
        throw new Error('MongoDB Atlas DNS resolution failed. This could be due to:\n' +
          '1. Network connectivity issues\n' +
          '2. Firewall blocking MongoDB ports\n' +
          '3. Invalid MongoDB connection string\n' +
          '4. MongoDB Atlas cluster is paused or unavailable\n' +
          'Please check your MONGODB_URI and network connection.');
      } else {
        throw new Error('Unable to connect to MongoDB Atlas. Please check your network connection and MongoDB cluster status.');
      }
    } else if (e.message.includes('authentication failed')) {
      throw new Error('MongoDB authentication failed. Please check your credentials.');
    } else if (e.message.includes('timeout')) {
      throw new Error('MongoDB connection timeout. Please try again later.');
    }
    
    throw e;
  }
}
