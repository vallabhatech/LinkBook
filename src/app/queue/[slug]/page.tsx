'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardBody, CardHeader } from '@/components/Card';

interface QueueStatus {
  currentlyServing: number | null;
  totalWaiting: number;
  estimatedWaitTime: number;
  queueEnabled: boolean;
}

interface TokenInfo {
  id: string;
  tokenNumber: number;
  status: string;
  position: number;
  estimatedWaitTime: number;
}

type QueuePageProps = {
  params: Promise<{ slug: string }>;
};

export default function QueuePage({ params }: QueuePageProps) {
  const { slug } = use(params);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [myToken, setMyToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Customer details for getting token
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchQueueStatus();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchQueueStatus();
      if (myToken) {
        checkMyToken();
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    // Check if user has an existing token in localStorage
    const storedToken = localStorage.getItem(`queue_token_${slug}`);
    if (storedToken) {
      checkMyToken(storedToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch(`/api/public/${slug}/queue`);
      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load queue status');
      }
    } catch {
      setError('Failed to load queue status');
    } finally {
      setIsLoading(false);
    }
  };

  const checkMyToken = async (tokenId?: string) => {
    const id = tokenId || localStorage.getItem(`queue_token_${slug}`);
    if (!id) return;

    try {
      const response = await fetch(`/api/public/${slug}/queue?tokenId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setMyToken(data.token);
        setQueueStatus({
          currentlyServing: data.currentlyServing,
          totalWaiting: data.totalWaiting,
          estimatedWaitTime: data.token.estimatedWaitTime,
          queueEnabled: true,
        });
      } else {
        // Token might be invalid/expired, clear it
        localStorage.removeItem(`queue_token_${slug}`);
        setMyToken(null);
      }
    } catch {
      console.error('Failed to check token status');
    }
  };

  const handleGetToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/public/${slug}/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMyToken(data.token);
        localStorage.setItem(`queue_token_${slug}`, data.token.id);
        setShowForm(false);
        fetchQueueStatus();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to get token');
      }
    } catch {
      setError('Failed to get token');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !queueStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !queueStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!queueStatus?.queueEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Queue Not Available</h2>
            <p className="text-gray-600">
              The walk-in queue is currently not enabled for this business.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white py-6">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold">Walk-in Queue</h1>
          <p className="text-blue-100 mt-1">Get your token and wait comfortably</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Current Status */}
        <Card className="mb-6">
          <CardBody>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Now Serving</p>
              <p className="text-5xl font-bold text-blue-600 my-2">
                #{queueStatus?.currentlyServing || '-'}
              </p>
              <p className="text-gray-500">
                {queueStatus?.totalWaiting} people waiting
              </p>
            </div>
          </CardBody>
        </Card>

        {/* User's Token */}
        {myToken ? (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-lg font-semibold text-center">Your Token</h2>
            </CardHeader>
            <CardBody>
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-bold text-blue-600">
                    #{myToken.tokenNumber}
                  </span>
                </div>
                
                {myToken.status === 'waiting' && (
                  <>
                    <p className="text-gray-600 mb-2">
                      Position in queue: <span className="font-semibold">{myToken.position}</span>
                    </p>
                    <p className="text-gray-600">
                      Estimated wait: <span className="font-semibold">{myToken.estimatedWaitTime} min</span>
                    </p>
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                      <p className="text-yellow-800 text-sm">
                        Please stay nearby. We&apos;ll call your number soon!
                      </p>
                    </div>
                  </>
                )}

                {myToken.status === 'serving' && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-green-800 font-semibold">
                      It&apos;s your turn! Please proceed to the counter.
                    </p>
                  </div>
                )}

                {myToken.status === 'completed' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      Your service has been completed. Thank you!
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        localStorage.removeItem(`queue_token_${slug}`);
                        setMyToken(null);
                      }}
                    >
                      Get New Token
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => checkMyToken()}
                >
                  Refresh Status
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : showForm ? (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Get Your Token</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleGetToken} className="space-y-4">
                <Input
                  label="Name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your name"
                />

                <Input
                  label="Phone (optional)"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Get Token
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </form>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Join the Queue</h2>
              <p className="text-gray-600 mb-6">
                Get a token number and we&apos;ll serve you in order
              </p>
              <Button onClick={() => setShowForm(true)}>
                Get Token
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Average wait time: ~{queueStatus?.estimatedWaitTime || 15} minutes</p>
          <p className="mt-1">Status updates every 30 seconds</p>
        </div>
      </main>
    </div>
  );
}
