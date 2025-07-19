import { Schema, model, Document } from 'mongoose';

// Enums for better type safety
export enum ContentType {
  VIDEO = 'video',
  SHORT = 'short',
  LIVESTREAM = 'livestream',
  PREMIERE = 'premiere',
  ADVERTISEMENT = 'advertisement',
  STANDARD = 'standard',
  AD = 'advertisement', // Keep for backwards compatibility
  UNKNOWN = 'unknown'
}

export enum VideoCategory {
  FILM_ANIMATION = 'Film & Animation',
  AUTOS_VEHICLES = 'Autos & Vehicles',
  MUSIC = 'Music',
  PETS_ANIMALS = 'Pets & Animals',
  SPORTS = 'Sports',
  TRAVEL_EVENTS = 'Travel & Events',
  GAMING = 'Gaming',
  PEOPLE_BLOGS = 'People & Blogs',
  COMEDY = 'Comedy',
  ENTERTAINMENT = 'Entertainment',
  NEWS_POLITICS = 'News & Politics',
  HOWTO_STYLE = 'Howto & Style',
  EDUCATION = 'Education',
  SCIENCE_TECHNOLOGY = 'Science & Technology',
  NONPROFITS_ACTIVISM = 'Nonprofits & Activism',
  UNKNOWN = 'Unknown'
}

// Core video entry interface
export interface IVideoEntry {
  // Basic information from watch history
  title: string;
  channel: string;
  channelId?: string;
  videoId?: string;
  watchedAt: Date;
  url: string;
  
  // Content classification
  contentType: ContentType;
  category: VideoCategory;
  
  // YouTube API enriched data
  description?: string;
  duration?: number; // in seconds
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: Date;
  tags?: string[];
  thumbnailUrl?: string;
  
  // Analytics metadata
  watchTimeSeconds?: number;
  completionPercentage?: number;
  isSubscribed?: boolean;
  discoveryMethod?: string; // search, recommended, subscription, etc.
  
  // Processing metadata
  enrichedWithAPI: boolean;
  lastUpdated: Date;
  processingErrors?: string[];
  
  // LLM enrichment metadata
  llmEnriched?: boolean;
  llmProvider?: 'anthropic' | 'openai';
  llmCost?: number;
  llmTokensUsed?: number;
}

// Document interface for Mongoose
export interface VideoEntryDocument extends IVideoEntry, Document {}

// Mongoose schema
const VideoEntrySchema = new Schema<VideoEntryDocument>({
  title: { type: String, required: true, index: true },
  channel: { type: String, required: true, index: true },
  channelId: { type: String, sparse: true, index: true },
  videoId: { type: String, sparse: true, index: true },
  watchedAt: { type: Date, required: true, index: true },
  url: { type: String, required: true },
  
  contentType: { 
    type: String, 
    enum: Object.values(ContentType), 
    default: ContentType.UNKNOWN,
    index: true 
  },
  category: { 
    type: String, 
    enum: Object.values(VideoCategory), 
    default: VideoCategory.UNKNOWN,
    index: true 
  },
  
  // YouTube API data
  description: String,
  duration: Number,
  viewCount: Number,
  likeCount: Number,
  commentCount: Number,
  publishedAt: Date,
  tags: [String],
  thumbnailUrl: String,
  
  // Analytics data
  watchTimeSeconds: Number,
  completionPercentage: Number,
  isSubscribed: Boolean,
  discoveryMethod: String,
  
  // Metadata
  enrichedWithAPI: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  processingErrors: [String],
  
  // LLM enrichment metadata
  llmEnriched: { type: Boolean, default: false },
  llmProvider: { type: String, enum: ['anthropic', 'openai'] },
  llmCost: Number,
  llmTokensUsed: Number
}, {
  timestamps: true,
  collection: 'video_entries'
});

// Indexes for performance
VideoEntrySchema.index({ watchedAt: -1 });
VideoEntrySchema.index({ channel: 1, watchedAt: -1 });
VideoEntrySchema.index({ category: 1, watchedAt: -1 });
VideoEntrySchema.index({ contentType: 1, watchedAt: -1 });
// videoId index already defined in schema with sparse: true, index: true

export const VideoEntry = model<VideoEntryDocument>('VideoEntry', VideoEntrySchema); 