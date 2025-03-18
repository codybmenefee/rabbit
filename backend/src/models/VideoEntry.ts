enum ContentType {
  STANDARD = 'standard',
  SHORT = 'short',
  ADVERTISEMENT = 'ad'
}

interface VideoEntry {
  title: string;
  channelName: string;
  watchDate: Date;
  url: string;
  durationSeconds?: number;
  contentType: ContentType;
}

export { VideoEntry, ContentType }; 