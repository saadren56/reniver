import { create } from 'zustand';
import { User, Message, Conversation, MessageReaction, Notification, FriendRequest, Friend } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient();

interface AppState {
  currentUser: User | null;
  users: User[];
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  theme: 'light' | 'dark';
  isTyping: boolean;
  replyingTo: Message | null;
  notifications: Notification[];
  friendRequests: FriendRequest[];
  friends: Friend[];
  loading: boolean;
  // Track active channels so we can destroy them on cleanups
  channels: RealtimeChannel[];
  
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
  setCurrentUser: (user: User | null) => void;
  fetchUsers: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  setSelectedConversation: (conversation: Conversation | null) => Promise<void>;
  sendMessage: (text: string, replyTo?: Message) => Promise<void>;
  toggleTheme: () => void;
  setIsTyping: (typing: boolean) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  editMessage: (messageId: string, newText: string) => void;
  deleteMessage: (messageId: string, forEveryone?: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  togglePin: (messageId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  fetchFriends: () => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: [],
  conversations: [],
  selectedConversation: null,
  messages: [],
  theme: 'light',
  isTyping: false,
  replyingTo: null,
  notifications: [],
  friendRequests: [],
  friends: [],
  loading: true,
  channels: [],

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (!user) {
      get().unsubscribeFromRealtime();
    }
  },

  subscribeToRealtime: () => {
    const { currentUser, fetchFriendRequests, fetchConversations, fetchMessages, fetchFriends, unsubscribeFromRealtime } = get();
    if (!currentUser) return;

    // Clean up any stray existing subscriptions first
    unsubscribeFromRealtime();

    const friendRequestsChannel = supabase
      .channel('friend_requests_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friend_requests' }, 
        () => { fetchFriendRequests(); }
      )
      .subscribe();

    const friendsChannel = supabase
      .channel('friends_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friends' }, 
        () => { fetchFriends(); }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('conversations_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' }, 
        () => { fetchConversations(); }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' }, 
        (payload) => {
          const { selectedConversation } = get();
          if (selectedConversation && payload.new && (payload.new as any).conversation_id === selectedConversation.id) {
            fetchMessages(selectedConversation.id);
          }
          fetchConversations();
        }
      )
      .subscribe();

    set({ channels: [friendRequestsChannel, friendsChannel, conversationsChannel, messagesChannel] });
  },

  unsubscribeFromRealtime: () => {
    const { channels } = get();
    channels.forEach(channel => supabase.removeChannel(channel));
    set({ channels: [] });
  },

  fetchUsers: async () => {
    try {
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
        const users: User[] = data.map(profile => ({
          id: profile.id,
          username: profile.username || 'User',
          email: profile.email || '',
          avatar: profile.avatar_url || '',
          status: 'offline'
        }));
        set({ users });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  },

  fetchConversations: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_members (
            user_id,
            profiles!inner ( id, username, email, avatar_url )
          ),
          messages ( id, content, media_url, media_type, created_at, sender_id )
        `)
        .order('created_at', { referencedTable: 'messages', ascending: false })
        .limit(1, { referencedTable: 'messages' });

      if (data) {
        const conversations: Conversation[] = data.map(conv => {
          const otherMember = conv.conversation_members?.find((m: any) => m.user_id !== user.id);
          const lastMessage = conv.messages?.[0];
          
          return {
            id: conv.id,
            type: conv.is_group ? 'group' : 'direct',
            name: conv.name,
            avatar: conv.avatar_url,
            description: conv.description,
            createdAt: new Date(conv.created_at),
            createdBy: conv.created_by,
            user: otherMember ? {
              id: otherMember.profiles.id,
              username: otherMember.profiles.username || 'User',
              email: otherMember.profiles.email || '',
              avatar: otherMember.profiles.avatar_url || '',
              status: 'offline'
            } : undefined,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              senderId: lastMessage.sender_id,
              receiverId: '',
              text: lastMessage.content || '',
              timestamp: new Date(lastMessage.created_at),
              read: false,
              mediaUrl: lastMessage.media_url,
              mediaType: lastMessage.media_type
            } : {
              id: '', senderId: '', receiverId: '', text: '', timestamp: new Date(), read: false
            },
            unreadCount: 0
          };
        });
        set({ conversations, loading: false });
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({ loading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (data) {
        const messages: Message[] = data.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: '',
          text: msg.content || '',
          timestamp: new Date(msg.created_at),
          read: false,
          mediaUrl: msg.media_url,
          mediaType: msg.media_type
        }));
        set({ messages });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  },

  setSelectedConversation: async (conversation) => {
    set({ selectedConversation: conversation, messages: [] });
    if (conversation) {
      await get().fetchMessages(conversation.id);
    }
  },

  sendMessage: async (text) => {
    const { selectedConversation, currentUser } = get();
    if (!selectedConversation || !currentUser || !selectedConversation.user) return;

    try {
      const { data: conversationData } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', selectedConversation.id)
        .single();

      let targetConversationId = selectedConversation.id;

      if (!conversationData) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ created_by: currentUser.id })
          .select('id')
          .single();

        if (newConv) {
          targetConversationId = newConv.id;
          await supabase.from('conversation_members').insert([
            { conversation_id: newConv.id, user_id: currentUser.id },
            { conversation_id: newConv.id, user_id: selectedConversation.user.id }
          ]);
        }
      }

      const newMessage = {
        conversation_id: targetConversationId,
        sender_id: currentUser.id,
        content: text,
      };

      await supabase.from('messages').insert(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  },

  toggleTheme: () => {
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }));
  },

  setIsTyping: (typing) => {
    set({ isTyping: typing });
  },

  addReaction: (messageId, emoji) => {
    const { currentUser, messages } = get();
    if (!currentUser) return;

    set({
      messages: messages.map(msg => {
        if (msg.id !== messageId) return msg;

        const currentReactions = msg.reactions || [];
        const reactionIndex = currentReactions.findIndex(r => r.emoji === emoji);
        let updatedReactions = [...currentReactions];

        if (reactionIndex !== -1) {
          const targetReaction = updatedReactions[reactionIndex];
          if (!targetReaction.userIds.includes(currentUser.id)) {
            updatedReactions[reactionIndex] = {
              ...targetReaction,
              userIds: [...targetReaction.userIds, currentUser.id]
            };
          }
        } else {
          updatedReactions.push({ emoji, userIds: [currentUser.id] });
        }
        
        return { ...msg, reactions: updatedReactions };
      })
    });
  },

  removeReaction: (messageId, emoji) => {
    const { currentUser, messages } = get();
    if (!currentUser) return;

    set({
      messages: messages.map(msg => {
        if (msg.id !== messageId) return msg;

        const updatedReactions = (msg.reactions || [])
          .map(reaction => {
            if (reaction.emoji === emoji) {
              return {
                ...reaction,
                userIds: reaction.userIds.filter(id => id !== currentUser.id)
              };
            }
            return reaction;
          })
          .filter(reaction => reaction.userIds.length > 0);
          
        return { ...msg, reactions: updatedReactions };
      })
    });
  },

  editMessage: (messageId, newText) => {
    set((state) => ({
      messages: state.messages.map(msg => 
        msg.id === messageId ? { ...msg, text: newText, edited: true } : msg
      )
    }));
  },

  deleteMessage: (messageId, forEveryone = false) => {
    set((state) => ({
      messages: state.messages.map(msg => 
        msg.id === messageId ? { ...msg, text: forEveryone ? 'This message was deleted' : msg.text, deleted: true } : msg
      )
    }));
  },

  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  togglePin: (messageId) => {
    set((state) => ({
      messages: state.messages.map(msg => 
        msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
      )
    }));
  },

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications]
    }));
  },

  markNotificationAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    }));
  },

  markAllNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  sendFriendRequest: async (userId) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUser.id,
          receiver_id: userId,
          status: 'pending'
        });
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  },

  declineFriendRequest: async (requestId) => {
    try {
      await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);
      await get().fetchFriendRequests();
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  },

  fetchFriendRequests: async () => {
    const { currentUser, users } = get();
    if (!currentUser) return;

    try {
      const { data } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (data) {
        const friendRequests: FriendRequest[] = data.map(req => ({
          id: req.id,
          senderId: req.sender_id,
          receiverId: req.receiver_id,
          status: req.status,
          createdAt: new Date(req.created_at),
          sender: users.find(u => u.id === req.sender_id)
        }));
        set({ friendRequests });
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  },

  fetchFriends: async () => {
    const { currentUser, users } = get();
    if (!currentUser) return;

    try {
      const { data } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', currentUser.id);

      if (data) {
        const friends: Friend[] = data.map(f => ({
          id: f.id,
          userId: f.user_id,
          friendId: f.friend_id,
          createdAt: new Date(f.created_at),
          friend: users.find(u => u.id === f.friend_id)
        }));
        set({ friends });
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  },

  removeFriend: async (friendId) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUser.id})`);
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  },

  acceptFriendRequest: async (requestId) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      const { data: request } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (request) {
        await supabase.from('friends').insert([
          { user_id: currentUser.id, friend_id: request.sender_id },
          { user_id: request.sender_id, friend_id: currentUser.id }
        ]);

        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ created_by: currentUser.id, is_group: false })
          .select('id')
          .single();

        if (newConv) {
          await supabase.from('conversation_members').insert([
            { conversation_id: newConv.id, user_id: currentUser.id },
            { conversation_id: newConv.id, user_id: request.sender_id }
          ]);
          await get().fetchConversations();
        }
      }

      await get().fetchFriendRequests();
      await get().fetchFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  }
}));