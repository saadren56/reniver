import { User, Message, Conversation } from '@/types';

export const currentUser: User = {
  id: 'user-1',
  username: 'john_doe',
  email: 'john@example.com',
  avatar: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20young%20man%20with%20short%20brown%20hair%2C%20friendly%20face%2C%20realistic&image_size=square_hd',
  status: 'online'
};

export const mockUsers: User[] = [
  {
    id: 'user-2',
    username: 'jane_smith',
    email: 'jane@example.com',
    avatar: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20young%20woman%20with%20blonde%20hair%2C%20smiling%2C%20realistic&image_size=square_hd',
    status: 'online'
  },
  {
    id: 'user-3',
    username: 'bob_wilson',
    email: 'bob@example.com',
    avatar: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20man%20with%20glasses%2C%20professional%20look%2C%20realistic&image_size=square_hd',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3600000)
  },
  {
    id: 'user-4',
    username: 'alice_jones',
    email: 'alice@example.com',
    avatar: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20woman%20with%20red%20hair%2C%20smiling%2C%20realistic&image_size=square_hd',
    status: 'online'
  },
  {
    id: 'user-5',
    username: 'charlie_brown',
    email: 'charlie@example.com',
    avatar: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=portrait%20of%20a%20man%20with%20curly%20hair%2C%20happy%2C%20realistic&image_size=square_hd',
    status: 'offline',
    lastSeen: new Date(Date.now() - 7200000)
  }
];

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    senderId: 'user-2',
    receiverId: 'user-1',
    text: 'Hey John! How are you doing?',
    timestamp: new Date(Date.now() - 3600000),
    read: true
  },
  {
    id: 'msg-2',
    senderId: 'user-1',
    receiverId: 'user-2',
    text: 'Hi Jane! I\'m doing great, thanks for asking!',
    timestamp: new Date(Date.now() - 3500000),
    read: true
  },
  {
    id: 'msg-3',
    senderId: 'user-2',
    receiverId: 'user-1',
    text: 'That\'s wonderful! Want to grab coffee later?',
    timestamp: new Date(Date.now() - 3400000),
    read: true
  },
  {
    id: 'msg-4',
    senderId: 'user-1',
    receiverId: 'user-2',
    text: 'Sure! How about 3 PM?',
    timestamp: new Date(Date.now() - 3300000),
    read: false
  }
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    type: 'direct',
    user: mockUsers[0],
    lastMessage: mockMessages[mockMessages.length - 1],
    unreadCount: 1,
    createdAt: new Date(Date.now() - 86400000)
  },
  {
    id: 'conv-2',
    type: 'direct',
    user: mockUsers[1],
    lastMessage: {
      id: 'msg-5',
      senderId: 'user-3',
      receiverId: 'user-1',
      text: 'Hey, did you finish the project?',
      timestamp: new Date(Date.now() - 86400000),
      read: true
    },
    unreadCount: 0,
    createdAt: new Date(Date.now() - 172800000)
  },
  {
    id: 'conv-3',
    type: 'direct',
    user: mockUsers[2],
    lastMessage: {
      id: 'msg-6',
      senderId: 'user-1',
      receiverId: 'user-4',
      text: 'Thanks for your help yesterday!',
      timestamp: new Date(Date.now() - 172800000),
      read: true
    },
    unreadCount: 0,
    createdAt: new Date(Date.now() - 259200000)
  }
];
