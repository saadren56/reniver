import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import { 
  MessageSquare, 
  Send, 
  LogOut, 
  User, 
  Search, 
  MoreVertical,
  Check,
  CheckCheck
} from 'lucide-react';

const Chat = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000');
      newSocket.emit('join', user._id);
      setSocket(newSocket);

      return () => newSocket.disconnect();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (message) => {
        if (selectedUser && 
            (message.sender === selectedUser._id || message.receiver === selectedUser._id)) {
          setMessages(prev => [...prev, message]);
        }
        fetchConversations();
      });
    }
  }, [socket, selectedUser]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchAllUsers();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/conversations', { withCredentials: true });
      setConversations(res.data.data);
    } catch (error) {
      console.error('Error fetching conversations', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/users/all', { withCredentials: true });
      setAllUsers(res.data.data);
    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${userId}`, { withCredentials: true });
      setMessages(res.data.data);
    } catch (error) {
      console.error('Error fetching messages', error);
    }
  };

  const handleSelectUser = (chatUser) => {
    setSelectedUser(chatUser);
    fetchMessages(chatUser._id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const res = await axios.post('http://localhost:5000/api/messages', 
        { receiver: selectedUser._id, text: newMessage }, 
        { withCredentials: true }
      );
      socket.emit('sendMessage', res.data.data);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb' }}>
      <div style={{ 
        width: '340px', 
        borderRight: '1px solid #e5e7eb', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'white'
      }}>
        <div style={{ 
          padding: '1rem 1.5rem', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={20} />
            </div>
            <h3 style={{ margin: 0, fontWeight: '600', fontSize: '1.125rem' }}>Chat App</h3>
          </div>
          <button 
            onClick={logout}
            style={{ 
              background: 'rgba(255,255,255,0.15)', 
              border: 'none', 
              padding: '0.5rem',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
          >
            <LogOut size={20} />
          </button>
        </div>

        <div style={{ padding: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              style={{ 
                width: '100%', 
                padding: '0.75rem 1rem 0.75rem 2.75rem', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxSizing: 'border-box',
                fontSize: '0.875rem',
                background: '#f9fafb'
              }}
            />
          </div>
        </div>
        
        <div style={{ 
          padding: '0 1rem 1rem 1rem', 
          overflowY: 'auto', 
          flex: 1
        }}>
          <h4 style={{ 
            margin: '0 0 0.75rem 0', 
            color: '#6b7280', 
            fontSize: '0.75rem', 
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Users
          </h4>
          {filteredUsers.map(u => (
            <div 
              key={u._id}
              onClick={() => handleSelectUser(u)}
              style={{ 
                padding: '0.875rem',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '0.25rem',
                background: selectedUser?._id === u._id ? '#eef2ff' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => {
                if (selectedUser?._id !== u._id) {
                  e.target.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedUser?._id !== u._id) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              <div style={{ 
                width: '44px', 
                height: '44px', 
                background: selectedUser?._id === u._id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selectedUser?._id === u._id ? 'white' : '#6b7280',
                fontWeight: '600',
                fontSize: '1.125rem'
              }}>
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: selectedUser?._id === u._id ? '600' : '500', 
                  color: '#1f2937',
                  fontSize: '0.9375rem'
                }}>
                  {u.username}
                </div>
                <div style={{ 
                  fontSize: '0.8125rem', 
                  color: '#6b7280',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {u.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedUser ? (
          <>
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderBottom: '1px solid #e5e7eb',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '1rem'
                }}>
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: '600', fontSize: '1rem', color: '#1f2937' }}>
                    {selectedUser.username}
                  </h3>
                  <p style={{ margin: '0.125rem 0 0 0', color: '#6b7280', fontSize: '0.8125rem' }}>
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button style={{
                background: 'none',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#6b7280',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                <MoreVertical size={20} />
              </button>
            </div>
            
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1.5rem',
              background: '#f9fafb'
            }}>
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    display: 'flex',
                    justifyContent: msg.sender === user._id ? 'flex-end' : 'flex-start',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ 
                    background: msg.sender === user._id 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'white',
                    color: msg.sender === user._id ? 'white' : '#111827',
                    padding: '0.875rem 1.125rem',
                    borderRadius: '12px',
                    maxWidth: '60%',
                    boxShadow: msg.sender === user._id 
                      ? '0 4px 6px -1px rgba(102, 126, 234, 0.3)' 
                      : '0 1px 2px rgba(0,0,0,0.05)',
                    position: 'relative'
                  }}>
                    <div style={{ fontSize: '0.9375rem', lineHeight: '1.5' }}>
                      {msg.text}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'flex-end',
                      marginTop: '0.375rem',
                      gap: '0.25rem'
                    }}>
                      <span style={{ 
                        fontSize: '0.6875rem', 
                        opacity: 0.7
                      }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {msg.sender === user._id && (
                        <span>
                          {msg.read ? (
                            <CheckCheck size={14} style={{ opacity: 0.8 }} />
                          ) : (
                            <Check size={14} style={{ opacity: 0.7 }} />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} style={{ 
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              background: 'white'
            }}>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                style={{ 
                  flex: 1,
                  padding: '0.875rem 1.125rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '0.9375rem',
                  background: '#f9fafb',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  e.target.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f9fafb';
                }}
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                style={{ 
                  background: newMessage.trim() 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  padding: '0.875rem 1.25rem',
                  borderRadius: '12px',
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (newMessage.trim()) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(102, 126, 234, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center',
            color: '#9ca3af'
          }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              background: '#e5e7eb', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <MessageSquare size={64} color="#d1d5db" />
            </div>
            <h3 style={{ color: '#6b7280', margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              Select a conversation
            </h3>
            <p style={{ margin: 0, fontSize: '0.9375rem' }}>
              Choose a user from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
