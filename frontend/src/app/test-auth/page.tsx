'use client';

import { useState, useEffect } from 'react';
import authService from '@/services/auth.service';
import axios from 'axios';

export default function TestAuth() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  useEffect(() => {
    // Check localStorage data
    const userData = authService.getCurrentUser();
    const token = authService.getToken();
    setLocalStorageData({
      userData,
      token,
      isAuthenticated: authService.isAuthenticated()
    });
  }, []);

  const testAuthentication = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      console.log('Token from localStorage:', token);
      
      if (!token) {
        setAuthStatus({
          error: 'No token found in localStorage',
          authenticated: false
        });
        return;
      }

      // Test with our API endpoint
      const response = await axios.get('/api/test-auth', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setAuthStatus(response.data);
    } catch (error: any) {
      console.error('Auth test error:', error);
      setAuthStatus({
        error: error.response?.data || error.message,
        authenticated: false
      });
    } finally {
      setLoading(false);
    }
  };

  const testDirectBackend = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      console.log('Testing direct backend with token:', token);
      
      if (!token) {
        setAuthStatus({
          error: 'No token found in localStorage',
          authenticated: false
        });
        return;
      }

      // Test directly with backend
      const response = await axios.get('http://localhost:3001/api/auth/test', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setAuthStatus({
        ...response.data,
        message: 'Direct backend test successful'
      });
    } catch (error: any) {
      console.error('Direct backend test error:', error);
      setAuthStatus({
        error: error.response?.data || error.message,
        authenticated: false,
        directBackendTest: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LocalStorage Data */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">LocalStorage Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          </div>

          {/* Test Controls */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            <div className="space-y-4">
              <button
                onClick={testAuthentication}
                disabled={loading}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test via API Route'}
              </button>
              
              <button
                onClick={testDirectBackend}
                disabled={loading}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Direct Backend'}
              </button>
            </div>
          </div>
        </div>

        {/* Auth Status */}
        {authStatus && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(authStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}