import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Check if we can get user data from localStorage (this won't work in server-side)
    // So we'll check the authorization header instead
    const authHeader = request.headers.get('authorization');
    
    console.log('Auth header received:', authHeader);
    
    if (!authHeader) {
      return NextResponse.json({ 
        error: 'No authorization header found',
        authenticated: false 
      }, { status: 401 });
    }

    // Test the token with backend
    const response = await fetch(`${BACKEND_URL}/api/auth/test`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log('Backend error:', errorData);
      return NextResponse.json(
        { 
          error: 'Token validation failed', 
          details: errorData,
          authenticated: false,
          backendStatus: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend success data:', data);
    
    return NextResponse.json({
      authenticated: true,
      user: data,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Error testing authentication:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        authenticated: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}