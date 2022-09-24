type NewsMedia = {
  type: "photo" | "animated_gif" | string;
  url?: string;
  previewUrl?: string;
};

type News = {
  source: string;
  author: string;
  content: string;
  timestamp: Date;
  media: NewsMedia[];
};

export type { NewsMedia, News };
