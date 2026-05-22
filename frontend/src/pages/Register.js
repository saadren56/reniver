import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(username, email, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Register</h2>
        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#991b1b', 
            padding: '0.75rem', 
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button 
            type="submit"
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Register
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          Already have an account? <Link to="/login" style={{ color: '#667eea', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
