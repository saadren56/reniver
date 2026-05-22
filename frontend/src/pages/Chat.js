import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const Chat = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [socket, setSocket] = useState(null);
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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '300px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '1rem', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>Chat App</h3>
          <button 
            onClick={logout}
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: 'none', 
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
        
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Users</h4>
          {allUsers.map(u => (
            <div 
              key={u._id}
              onClick={() => handleSelectUser(u)}
              style={{ 
                padding: '0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                background: selectedUser?._id === u._id ? '#eef2ff' : 'transparent'
              }}
            >
              <div style={{ fontWeight: '500' }}>{u.username}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{u.email}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedUser ? (
          <>
            <div style={{ 
              padding: '1rem', 
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <h3 style={{ margin: 0 }}>{selectedUser.username}</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>{selectedUser.email}</p>
            </div>
            
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1rem',
              background: '#f3f4f6'
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
                    background: msg.sender === user._id ? '#667eea' : 'white',
                    color: msg.sender === user._id ? 'white' : '#111827',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    maxWidth: '70%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} style={{ 
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                style={{ 
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px'
                }}
              />
              <button 
                type="submit"
                style={{ 
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: '#9ca3af'
          }}>
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
