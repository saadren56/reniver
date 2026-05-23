export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface MessageReply {
  id: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Date;
  read: boolean;
  mediaUrl?: string;
  mediaType?: string;
  reactions?: MessageReaction[];
  edited?: boolean;
  deleted?: boolean;
  replyTo?: MessageReply;
  pinned?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

export type ConversationType = 'direct' | 'group';

export interface ConversationMember {
  user: User;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  user?: User;
  name?: string;
  avatar?: string;
  description?: string;
  members?: ConversationMember[];
  lastMessage: Message;
  unreadCount: number;
  createdBy?: string;
  createdAt: Date;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  createdAt: Date;
  friend?: User;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  sender?: User;
}

export type NotificationType = 'message' | 'reaction' | 'mention' | 'friend_request';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  fromUser?: User;
  messageId?: string;
  conversationId?: string;
  timestamp: Date;
  read: boolean;
}
