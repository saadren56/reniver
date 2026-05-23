'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { useDebounce } from '@/hooks/use-debounce';
import { 
  Search, 
  Settings, 
  LogOut, 
  Send, 
  Smile, 
  Image as ImageIcon, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  MessageSquare,
  Phone,
  Video,
  X,
  Loader2,
  FileText,
  File,
  FileArchive,
  ThumbsUp,
  Heart,
  Laugh,
  Frown,
  Angry,
  Edit,
  Trash2,
  Reply,
  Pin,
  CornerUpLeft,
  Bell,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { getSocket } from '@/lib/socket';
import { createClient, } from '@/lib/supabase/client';
import { uploadMedia } from '@/lib/supabase/storage';
import { User, Message, Conversation } from '@/types';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function ChatPage() {
  const {
    currentUser,
    users,
    searchResults,
    conversations,
    selectedConversation,
    messages,
    theme,
    isTyping,
    replyingTo,
    notifications,
    friendRequests,
    friends,
    searchLoading,
    loading,
    setCurrentUser,
    fetchUsers,
    searchUsers,
    fetchConversations,
    fetchMessages,
    setSelectedConversation,
    getOrCreateDirectConversation,
    sendMessage,
    toggleTheme,
    setIsTyping,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    setReplyingTo,
    togglePin,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    fetchFriendRequests,
    fetchFriends,
    removeFriend,
    subscribeToRealtime
  } = useAppStore();

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const debouncedFriendSearch = useDebounce(friendSearchQuery, 300);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'conversations' | 'friends' | 'requests'>('conversations');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const socket = getSocket();

  const [toastNotifications, setToastNotifications] = useState<Array<{ id: string; title: string; body: string }>>([]);

  const showToast = (title: string, body: string) => {
    const id = `toast-${Date.now()}`;
    setToastNotifications(prev => [...prev, { id, title, body }]);
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (addFriendOpen) {
      searchUsers(debouncedFriendSearch);
    }
  }, [debouncedFriendSearch, addFriendOpen, searchUsers]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUser({
            id: profile.id,
            username: profile.username || session.user.email?.split('@')[0] || 'User',
            email: profile.email || session.user.email || '',
            avatar: profile.avatar_url || '',
            status: 'online'
          });
        } else {
          setCurrentUser({
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            avatar: '',
            status: 'online'
          });
        }
        await fetchUsers();
        await fetchConversations();
        await fetchFriendRequests();
        await fetchFriends();
        subscribeToRealtime();
      }
    };
    loadCurrentUser();
  }, [supabase, setCurrentUser, fetchUsers, fetchConversations, fetchFriendRequests, fetchFriends, subscribeToRealtime]);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket.IO connected');
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.log('Socket.IO connection error:', error);
      setSocketConnected(false);
    });

    socket.on('error', (error) => {
      console.log('Socket.IO error:', error);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    if (!socketConnected || !currentUser?.id) return;

    socket.emit('user:join', currentUser.id);

    socket.on('presence:online', (userIds: string[]) => {
      setOnlineUserIds(userIds);
    });

    socket.on('presence:offline', (userId: string) => {
      setOnlineUserIds(prev => prev.filter(id => id !== userId));
    });

    socket.on('message:new', (message: Message) => {
      if (selectedConversation?.type === 'direct' && selectedConversation.user?.id === message.senderId) {
        sendMessage(message.text);
      } else {
        const senderName = selectedConversation?.type === 'direct' 
          ? selectedConversation.user?.username || 'Someone' 
          : selectedConversation?.name || 'Someone';
        const notification = {
          type: 'message' as const,
          title: `New message from ${senderName}`,
          body: message.text || 'Sent an attachment',
          fromUser: selectedConversation?.type === 'direct' ? selectedConversation.user : undefined,
          messageId: message.id,
          conversationId: selectedConversation?.id
        };
        addNotification(notification);
        showToast(notification.title, notification.body);
        showBrowserNotification(notification.title, notification.body);
      }
    });

    socket.on('typing:start', (data: { userId: string; conversationId: string }) => {
      if (selectedConversation?.id === data.conversationId) {
        setTypingUserId(data.userId);
        setIsTyping(true);
      }
    });

    socket.on('typing:stop', (data: { userId: string; conversationId: string }) => {
      if (selectedConversation?.id === data.conversationId) {
        setTypingUserId(null);
        setIsTyping(false);
      }
    });

    socket.on('friend_request:new', (data: { senderId: string; receiverId: string }) => {
      if (data.receiverId === currentUser.id) {
        fetchFriendRequests();
        const sender = users.find(u => u.id === data.senderId);
        if (sender) {
          showToast('New Friend Request', `${sender.username} sent you a friend request!`);
          showBrowserNotification('New Friend Request', `${sender.username} sent you a friend request!`);
        }
      }
    });

    socket.on('friend_request:accepted', (data: { senderId: string; receiverId: string }) => {
      if (data.senderId === currentUser.id) {
        fetchFriendRequests();
        fetchFriends();
        fetchConversations();
        const receiver = users.find(u => u.id === data.receiverId);
        if (receiver) {
          showToast('Friend Request Accepted', `${receiver.username} accepted your friend request!`);
          showBrowserNotification('Friend Request Accepted', `${receiver.username} accepted your friend request!`);
        }
      }
    });

    socket.on('friend_request:declined', (data: { senderId: string; receiverId: string }) => {
      if (data.senderId === currentUser.id) {
        fetchFriendRequests();
        const receiver = users.find(u => u.id === data.receiverId);
        if (receiver) {
          showToast('Friend Request Declined', `${receiver.username} declined your friend request`);
        }
      }
    });

    socket.on('friend:added', (data: { userId: string; friendId: string }) => {
      if (data.friendId === currentUser.id || data.userId === currentUser.id) {
        fetchFriends();
        fetchConversations();
      }
    });

    socket.on('friend:removed', (data: { userId: string; friendId: string }) => {
      if (data.friendId === currentUser.id || data.userId === currentUser.id) {
        fetchFriends();
        fetchConversations();
      }
    });

    return () => {
      socket.off('presence:online');
      socket.off('presence:offline');
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('friend_request:new');
      socket.off('friend_request:accepted');
      socket.off('friend_request:declined');
      socket.off('friend:added');
      socket.off('friend:removed');
    };
  }, [socketConnected, currentUser, selectedConversation, sendMessage, setIsTyping, users]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setMediaPreview(null);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReaction = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    const hasReacted = message?.reactions?.some(r => 
      r.emoji === emoji && r.userIds.includes(currentUser?.id || '')
    );
    
    if (hasReacted) {
      removeReaction(messageId, emoji);
    } else {
      addReaction(messageId, emoji);
    }
  };

  const startEdit = (message: Message) => {
    setEditingMessage(message);
    setEditText(message.text);
  };

  const saveEdit = () => {
    if (editingMessage && editText.trim()) {
      editMessage(editingMessage.id, editText);
      setEditingMessage(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConversation && currentUser) {
      if (mediaFile) {
        try {
          setMediaUploading(true);
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user');

          const mediaUrl = await uploadMedia(mediaFile, user.id);
          
          const message = {
            id: `msg-${Date.now()}`,
            senderId: currentUser.id,
            receiverId: selectedConversation.user?.id || '',
            text: inputText,
            timestamp: new Date(),
            read: false,
            mediaUrl,
            mediaType: mediaFile.type
          };
          
          socket.emit('message:send', message);
          sendMessage(inputText, replyingTo || undefined);
          setInputText('');
          setMediaFile(null);
          setMediaPreview(null);
        } catch (error) {
          alert('Error uploading media');
        } finally {
          setMediaUploading(false);
        }
      } else if (inputText.trim() && currentUser) {
        const message = {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          receiverId: selectedConversation.user?.id || '',
          text: inputText,
          timestamp: new Date(),
          read: false
        };
        socket.emit('message:send', message);
        sendMessage(inputText, replyingTo || undefined);
        setInputText('');
      }
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const pinnedMessages = messages.filter(m => m.pinned);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (selectedConversation && currentUser) {
      if (e.target.value) {
        socket.emit('typing:start', { 
          userId: currentUser.id, 
          conversationId: selectedConversation.id 
        });
      } else {
        socket.emit('typing:stop', { 
          userId: currentUser.id, 
          conversationId: selectedConversation.id 
        });
      }
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const getMediaIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-6 w-6" />;
    if (type === 'application/pdf') return <FileText className="h-6 w-6" />;
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return <FileArchive className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    if (conv.type === 'direct' && conv.user) {
      return (
        conv.user.username.toLowerCase().includes(searchLower) ||
        conv.lastMessage.text.toLowerCase().includes(searchLower)
      );
    }
    if (conv.type === 'group' && conv.name) {
      return (
        conv.name.toLowerCase().includes(searchLower) ||
        conv.lastMessage.text.toLowerCase().includes(searchLower)
      );
    }
    return false;
  });

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`h-screen flex flex-col md:flex-row ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Sidebar */}
      <div className={`w-full md:w-72 lg:w-80 border-r flex flex-col ${theme === 'dark' ? 'bg-[#111b21] border-[#2a3942]' : 'bg-white border-gray-200'}`}>
        {/* Sidebar Header */}
        <div className={`p-3 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-[#202c33] border-[#2a3942]' : 'bg-[#f0f2f5] border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={currentUser?.avatar || ''} />
              <AvatarFallback>{currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{currentUser?.username || 'User'}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                {socketConnected ? 'Online' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Dialog 
              open={addFriendOpen} 
              onOpenChange={(open) => {
                if (open) {
                  fetchUsers();
                }
                setAddFriendOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  {friendRequests.filter(r => r.receiverId === currentUser?.id && r.status === 'pending').length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-red-500">
                      {friendRequests.filter(r => r.receiverId === currentUser?.id && r.status === 'pending').length}
                    </Badge>
                  )}
                  <UserPlus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Friend</DialogTitle>
                  <DialogDescription>Search for users to send friend requests!</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search users by email or username..."
                      value={friendSearchQuery}
                      onChange={(e) => setFriendSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {searchResults.filter(u => 
                          !friends.some(f => f.friendId === u.id)
                        ).map(user => {
                          const alreadySentRequest = friendRequests.some(r => 
                            r.senderId === currentUser?.id && r.receiverId === user.id && r.status === 'pending'
                          );
                          const alreadyReceivedRequest = friendRequests.some(r => 
                            r.senderId === user.id && r.receiverId === currentUser?.id && r.status === 'pending'
                          );
                          const isOnline = onlineUserIds.includes(user.id);
                          
                          return (
                            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  {isOnline && (
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#202c33]" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">{user.username}</p>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                                </div>
                              </div>
                              {alreadySentRequest ? (
                                <Button size="sm" variant="ghost" disabled>
                                  Pending
                                </Button>
                              ) : alreadyReceivedRequest ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => acceptFriendRequest(friendRequests.find(r => r.senderId === user.id)?.id!)}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                                    onClick={() => declineFriendRequest(friendRequests.find(r => r.senderId === user.id)?.id!)}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  size="sm" 
                                  className="bg-[#00a884] hover:bg-[#008f6f] text-white"
                                  onClick={async () => {
                                    await sendFriendRequest(user.id);
                                  }}
                                >
                                  Add Friend
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {searchResults.filter(u => 
                          !friends.some(f => f.friendId === u.id)
                        ).length === 0 && !searchLoading && (
                          <p className={`text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            No users found
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {friendRequests.filter(r => r.receiverId === currentUser?.id && r.status === 'pending').length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-3">Pending Requests</h4>
                      <div className="space-y-2">
                        {friendRequests.filter(r => r.receiverId === currentUser?.id && r.status === 'pending').map(request => {
                          const sender = users.find(u => u.id === request.senderId);
                          if (!sender) return null;
                          return (
                            <div key={request.id} className="flex items-center justify-between p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={sender.avatar} />
                                  <AvatarFallback>{sender.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-sm">{sender.username}</p>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Wants to add you</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => acceptFriendRequest(request.id)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                                  onClick={() => declineFriendRequest(request.id)}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <LogOut className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="p-2 border-b" style={{ borderColor: theme === 'dark' ? '#2a3942' : '#e5e7eb' }}>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSidebarTab('conversations')}
              className={`flex-1 ${activeSidebarTab === 'conversations' 
                ? (theme === 'dark' ? 'bg-[#2a3942]' : 'bg-[#f0f2f5]') 
                : ''}`}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chats
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSidebarTab('friends')}
              className={`flex-1 ${activeSidebarTab === 'friends' 
                ? (theme === 'dark' ? 'bg-[#2a3942]' : 'bg-[#f0f2f5]') 
                : ''}`}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Friends
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder={`Search ${activeSidebarTab === 'conversations' ? 'conversations' : 'friends'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeSidebarTab === 'conversations' && (
            <AnimatePresence>
              {filteredConversations.map((conversation, index) => {
              const isOnline = conversation.type === 'direct' && conversation.user 
                ? onlineUserIds.includes(conversation.user.id) 
                : false;
              
              const displayName = conversation.type === 'group' 
                ? conversation.name 
                : conversation.user?.username || 'Unknown';
              
              const avatarSrc = conversation.type === 'group' 
                ? conversation.avatar 
                : conversation.user?.avatar;
              
              const avatarFallback = conversation.type === 'group' 
                ? (conversation.name?.charAt(0)?.toUpperCase() || 'G') 
                : (conversation.user?.username?.charAt(0)?.toUpperCase() || 'U');

              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? theme === 'dark'
                        ? 'bg-[#2a3942]'
                        : 'bg-[#f0f2f5]'
                      : ''
                  }`}>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={avatarSrc || ''} />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#111b21]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium truncate text-base">{displayName}</p>
                        <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          {formatTime(conversation.lastMessage.timestamp)}
                        </span>
                      </div>
                      <p className={`text-sm truncate mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {conversation.lastMessage.text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          )}

          {activeSidebarTab === 'friends' && (
            <div className="space-y-1">
              {friends.filter(friend => {
                const username = friend?.username ?? "";
                const email = friend?.email ?? "";
                return (
                  username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  email.toLowerCase().includes(searchQuery.toLowerCase())
                );
              }).length === 0 ? (
                <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {friends.length === 0 ? "No friends yet" : "No friends found"}
                </div>
              ) : friends.filter(friend => {
                const username = friend?.username ?? "";
                const email = friend?.email ?? "";
                return (
                  username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  email.toLowerCase().includes(searchQuery.toLowerCase())
                );
              }).map((friend) => {
                const isOnline = onlineUserIds.includes(friend.id);
                
                return (
                  <div
                    key={friend.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      theme === 'dark' 
                        ? 'hover:bg-[#2a3942]' 
                        : 'hover:bg-[#f0f2f5]'
                    }`}
                    onClick={async () => {
                      const conversationId = await getOrCreateDirectConversation(friend.id);
                      if (conversationId) {
                        const conv = conversations.find(c => c.id === conversationId);
                        if (conv) {
                          await setSelectedConversation(conv);
                          setActiveSidebarTab('conversations');
                        }
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend?.avatar ?? ''} />
                          <AvatarFallback>{(friend?.username ?? 'U').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 rounded-full" style={{ borderColor: theme === 'dark' ? '#111b21' : 'white' }}></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend?.username ?? 'Unknown'}</p>
                        <p className={`text-sm truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MessageSquare className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className={`p-3 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-[#202c33] border-[#2a3942]' : 'bg-[#f0f2f5] border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedConversation.type === 'group' 
                    ? selectedConversation.avatar || '' 
                    : selectedConversation.user?.avatar || ''} 
                  />
                  <AvatarFallback>
                    {selectedConversation.type === 'group' 
                      ? (selectedConversation.name?.charAt(0)?.toUpperCase() || 'G') 
                      : (selectedConversation.user?.username?.charAt(0)?.toUpperCase() || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedConversation.type === 'group' 
                      ? selectedConversation.name 
                      : selectedConversation.user?.username || 'Unknown'}
                  </p>
                  {selectedConversation.type === 'direct' && selectedConversation.user && (
                    <p className={`text-xs ${
                      onlineUserIds.includes(selectedConversation.user.id)
                        ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {onlineUserIds.includes(selectedConversation.user.id) ? 'Online' : 'Offline'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Pinned Messages Banner */}
            <AnimatePresence>
              {pinnedMessages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-3 border-b flex items-center gap-2 ${theme === 'dark' ? 'bg-yellow-900/30 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}
                >
                  <Pin className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>
                    {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${theme === 'dark' ? 'bg-[#0b141a]' : 'bg-[#e5ddd5]'}`} style={{ backgroundImage: theme === 'dark' ? 'url("data:image/svg+xml,%3Csvg width=\'42\' height=\'44\' viewBox=\'0 0 42 44\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg id=\'Page-1\' fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg id=\'Chat-Tile\' fill=\'%23182229\' fill-opacity=\'0.9\'%3E%3Cpath d=\'M20 18c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.2 0-4 1.8-4 4v1h8v-1c0-2.2-1.8-4-4-4zm10-10h-1V7c0-.6-.4-1-1-1s-1 .4-1 1v3h-1c-.6 0-1 .4-1 1s.4 1 1 1h3V7c0-.6.4-1 1-1s1 .4 1 1v10h1c.6 0 1-.4 1-1s-.4-1-1-1zm-20 0h-1V7c0-.6-.4-1-1-1s-1 .4-1 1v3h-1c-.6 0-1 .4-1 1s.4 1 1 1h3V7c0-.6.4-1 1-1s1 .4 1 1v10h1c.6 0 1-.4 1-1s-.4-1-1-1z\' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' : 'url("data:image/svg+xml,%3Csvg width=\'42\' height=\'44\' viewBox=\'0 0 42 44\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg id=\'Page-1\' fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg id=\'Chat-Tile\' fill=\'%23d3d3d3\' fill-opacity=\'0.9\'%3E%3Cpath d=\'M20 18c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.2 0-4 1.8-4 4v1h8v-1c0-2.2-1.8-4-4-4zm10-10h-1V7c0-.6-.4-1-1-1s-1 .4-1 1v3h-1c-.6 0-1 .4-1 1s.4 1 1 1h3V7c0-.6.4-1 1-1s1 .4 1 1v10h1c.6 0 1-.4 1-1s-.4-1-1-1zm-20 0h-1V7c0-.6-.4-1-1-1s-1 .4-1 1v3h-1c-.6 0-1 .4-1 1s.4 1 1 1h3V7c0-.6.4-1 1-1s1 .4 1 1v10h1c.6 0 1-.4 1-1s-.4-1-1-1z\' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: index * 0.05,
                      type: 'spring',
                      stiffness: 250,
                      damping: 25
                    }}
                    className={`flex ${currentUser && message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`max-w-[65%] px-3 py-2 ${
                            currentUser && message.senderId === currentUser.id
                              ? theme === 'dark'
                                ? 'bg-[#005c4b] text-white rounded-tl-lg rounded-bl-lg rounded-tr-lg'
                                : 'bg-[#d9fdd3] text-gray-900 rounded-tl-lg rounded-bl-lg rounded-tr-lg'
                              : theme === 'dark'
                              ? 'bg-[#202c33] text-white rounded-tl-lg rounded-bl-lg rounded-tr-lg'
                              : 'bg-white text-gray-900 rounded-tl-lg rounded-bl-lg rounded-tr-lg shadow-sm'
                          }`}>
                          {message.replyTo && (
                            <div className={`mb-2 p-2 rounded-lg border-l-2 ${
                              theme === 'dark' 
                                ? 'bg-black/20 border-purple-400' 
                                : 'bg-gray-50 border-purple-500'
                            }`}>
                              <p className="text-xs opacity-70 mb-1">
                                {currentUser && message.replyTo.senderId === currentUser.id 
                                  ? 'You' 
                                  : selectedConversation?.type === 'group' 
                                    ? 'Someone' 
                                    : selectedConversation?.user?.username}
                              </p>
                              <p className="text-sm truncate">{message.replyTo.text}</p>
                            </div>
                          )}
                          
                          {message.mediaUrl && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className="mb-2"
                            >
                              {message.mediaType?.startsWith('image/') ? (
                                <img 
                                  src={message.mediaUrl} 
                                  alt="Attachment" 
                                  className="rounded-lg max-h-64 object-cover"
                                />
                              ) : (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 dark:bg-black/10">
                                  {getMediaIcon(message.mediaType || '')}
                                  <span className="text-sm truncate">
                                    {message.mediaUrl.split('/').pop()}
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          )}
                          
                          {editingMessage?.id === message.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="bg-white/20 dark:bg-black/20 border-none"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                                <Button size="sm" onClick={saveEdit} className="bg-purple-600">Save</Button>
                              </div>
                            </div>
                          ) : (
                            <p className={message.deleted ? 'italic opacity-70' : ''}>
                              {message.text}
                            </p>
                          )}
                          
                          <div className={`flex items-center gap-1 mt-1 justify-end ${currentUser && message.senderId === currentUser.id ? 'text-purple-200' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {message.edited && <span className="text-xs mr-1">(edited)</span>}
                            <span className="text-xs">{formatTime(message.timestamp)}</span>
                            {currentUser && message.senderId === currentUser.id && (
                              message.read ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                          
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {message.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  onClick={() => handleReaction(message.id, reaction.emoji)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                                    currentUser && reaction.userIds.includes(currentUser.id)
                                      ? theme === 'dark' ? 'bg-purple-700' : 'bg-purple-100'
                                      : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span className="text-xs">{reaction.userIds.length}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={currentUser && message.senderId === currentUser.id ? 'end' : 'start'}>
                        <div className="flex gap-1 p-2 border-b">
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <DropdownMenuItem onClick={() => setReplyingTo(message)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        {currentUser && message.senderId === currentUser.id && (
                          <>
                            <DropdownMenuItem onClick={() => startEdit(message)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMessage(message.id, true)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete for Everyone
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMessage(message.id, false)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete for Me
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => togglePin(message.id)}>
                          <Pin className="h-4 w-4 mr-2" />
                          {message.pinned ? 'Unpin' : 'Pin'} Message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {isTyping && selectedConversation?.type === 'direct' && typingUserId === selectedConversation?.user?.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex justify-start"
                  >
                    <div className={`rounded-2xl px-4 py-3 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
                      <div className="flex gap-1">
                        <motion.div 
                          className="w-2 h-2 rounded-full bg-gray-400"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div 
                          className="w-2 h-2 rounded-full bg-gray-400"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div 
                          className="w-2 h-2 rounded-full bg-gray-400"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Media Preview */}
            <AnimatePresence>
              {(mediaPreview || (mediaFile && !mediaPreview) || replyingTo) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`border-t overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
                >
                  <div className="p-4 space-y-3">
                    {replyingTo && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 border-l-2 border-purple-500">
                        <CornerUpLeft className="h-4 w-4 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-xs text-purple-600 dark:text-purple-400">
                            Replying to {currentUser && replyingTo.senderId === currentUser.id 
                              ? 'yourself' 
                              : selectedConversation?.type === 'group' 
                                ? 'someone' 
                                : selectedConversation?.user?.username}
                          </p>
                          <p className="text-sm truncate">{replyingTo.text}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setReplyingTo(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {mediaPreview ? (
                      <div className="relative inline-block">
                        <motion.img 
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          src={mediaPreview} 
                          alt="Preview" 
                          className="h-32 rounded-lg object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={clearMedia}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : mediaFile && (
                      <div className="relative inline-flex items-center gap-3 p-3 rounded-lg border">
                        {getMediaIcon(mediaFile.type)}
                        <span className="text-sm truncate max-w-xs">{mediaFile.name}</span>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={clearMedia}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input */}
            <div className={`p-3 border-t ${theme === 'dark' ? 'bg-[#202c33] border-[#2a3942]' : 'bg-[#f0f2f5] border-gray-200'}`}>
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                  onChange={handleMediaSelect}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mediaUploading}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <div className="relative" ref={emojiPickerRef}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full flex-shrink-0" 
                    disabled={mediaUploading}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className={`absolute bottom-12 left-0 p-3 rounded-xl shadow-lg grid grid-cols-6 gap-2 ${
                          theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                        }`}
                      >
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addEmoji(emoji)}
                            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1">
                  <Input
                    placeholder={replyingTo ? 'Type a reply...' : 'Type a message...'}
                    value={inputText}
                    onChange={handleInputChange}
                    disabled={mediaUploading}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex-shrink-0"
                  disabled={(!inputText.trim() && !mediaFile) || mediaUploading}
                >
                  {mediaUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <MessageSquare className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Select a conversation</h2>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose someone from your contacts to start chatting
            </p>
          </div>
        )}
        {/* Toast Notifications */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[100]">
          <AnimatePresence>
            {toastNotifications.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, y: 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 50, y: 0 }}
                transition={{ duration: 0.3, type: 'spring' }}
                className={`p-4 rounded-xl shadow-xl max-w-sm flex items-start gap-3 ${
                  theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {toast.title}
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                    {toast.body}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full flex-shrink-0"
                  onClick={() => setToastNotifications(prev => prev.filter(t => t.id !== toast.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
