/**
 * Navigation types for React Navigation
 * Defines all route parameters for type-safe navigation
 */

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Home: undefined;
  Reels: undefined;
  Messages: undefined;
  Profile: undefined;
  StartupDetail: {id: string};
  Notifications: undefined;
  CreatePost: undefined;
  CreateReel: undefined;
  EditPost: {postId: string};
  EditProfile: undefined;
  FollowList: {
    userId: string;
    type: 'followers' | 'following';
    username?: string;
  };
  Chat: {
    conversationId: string;
    otherUserId: string;
    otherUserName?: string;
    otherUserImage?: string;
  };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
