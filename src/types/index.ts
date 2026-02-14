// Type definitions for Viora App

export interface Author {
  _id: string;
  id: string;
  name: string;
  username: string;
  email: string;
  image: string;
  bio?: string;
  savedStartups?: Array<{_ref: string}>;
  upvotedStartups?: Array<{_ref: string}>;
  savedReels?: Array<{_ref: string}>;
  upvotedReels?: Array<{_ref: string}>;
  followers?: Array<{_ref: string}>;
  following?: Array<{_ref: string}>;
}

export interface Startup {
  _id: string;
  title: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  _createdAt: string;
  author: Author;
  views: number;
  description: string;
  category: string;
  image: string;
  pitch?: string;
  pitchVideo?: string;
  upvotes?: number;
  upvotedBy?: Array<{_ref: string}>;
  tags?: string[];
  isDraft?: boolean;
  scheduledFor?: string;
}

export interface Reel {
  _id: string;
  title: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  _createdAt: string;
  author: Author & {
    isFollowing?: boolean;
  };
  views: number;
  description: string;
  video?: string;
  videoUrl?: string;
  thumbnail?: string;
  duration?: number;
  upvotes?: number;
  upvotedBy?: Array<{_ref: string}>;
  tags?: string[];
  commentCount?: number;
  hasUpvoted?: boolean;
  isSaved?: boolean;
}

export interface Comment {
  _id: string;
  _createdAt: string;
  author: Author;
  content: string;
  startup?: {
    _ref: string;
  };
  reel?: {
    _ref: string;
  };
  upvotes?: number;
  upvotedBy?: Array<{_ref: string}>;
  parentComment?: {
    _ref: string;
  };
  replies?: Comment[];
}

export interface Message {
  _id: string;
  content: string;
  image?: string;
  sender: Author;
  conversation?: {
    _ref: string;
  };
  readBy?: Array<{_ref: string}>;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: Author[];
  lastMessage?: Message;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: 'follow' | 'upvote' | 'comment' | 'mention' | 'reply' | 'new_post' | 'new_reel' | 'reel_upvote' | 'reel_comment' | 'save' | 'reel_save' | 'milestone';
  message: string;
  read: boolean;
  _createdAt: string;
  milestoneType?: string;
  milestoneValue?: number;
  sender?: Author;
  recipient?: {_ref: string};
  startup?: {
    _id: string;
    title: string;
    slug: {current: string};
    image?: string;
  };
  reel?: {
    _id: string;
    title: string;
    slug: {current: string};
    thumbnail?: string;
    videoUrl?: string;
  };
  comment?: {
    _id: string;
    content: string;
  };
}

export interface AuthorStats {
  _id: string;
  totalPosts: number;
  totalViews: number;
  totalUpvotes: number;
  followerCount: number;
  followingCount: number;
}

export interface AuthorReelsStats {
  _id: string;
  totalReels: number;
  totalReelViews: number;
  totalReelUpvotes: number;
  totalComments: number;
}

export interface GrowthData {
  _createdAt: string;
  views: number;
  upvotes: number;
  title: string;
}

export type SortOption = 'latest' | 'views' | 'upvotes' | 'trending';

export type PostType = 'startup' | 'reel';

export interface CreatePostData {
  type: PostType;
  title: string;
  description: string;
  category?: string;
  image?: string;
  video?: string;
  pitch?: string;
  tags?: string[];
}

export interface PaginationParams {
  offset: number;
  limit: number;
  search?: string;
  tag?: string;
  userId?: string;
}
