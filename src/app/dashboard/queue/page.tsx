'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { format } from 'date-fns';

interface QueueToken {
  id: string;
  tokenNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  estimatedWaitTime: number | null;
  createdAt: string;
  servedAt: string | null;
}

interface QueueData {
  tokens: QueueToken[];
  currentToken: number | null;
  waitingCount: number;
  completedCount: number;
  queueEnabled: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  serving: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-gray-100 text-gray-800',
};

export default function QueueManagementPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const fetchQueueData = useCallback(async () => {
    if (!token || !user?.serviceProvider) return;

    try {
      const providerId = user.serviceProvider.id;
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const response = await fetch(`/api/providers/${providerId}/queue?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueueData(data);
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.serviceProvider]);

  const fetchQRCode = useCallback(async () => {
    if (!token || !user?.serviceProvider) return;

    try {
      const providerId = user.serviceProvider.id;
      const response = await fetch(`/api/providers/${providerId}/qrcode?type=queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.qrCode);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  }, [token, user?.serviceProvider]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && !user.serviceProvider) {
      router.push('/onboarding');
      return;
    }

    if (user?.serviceProvider) {
      fetchQueueData();
      fetchQRCode();
      
      // Poll for updates every 10 seconds
      const interval = setInterval(fetchQueueData, 10000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading, router, fetchQueueData, fetchQRCode]);

  const toggleQueue = async () => {
    if (!token || !user?.serviceProvider) return;

    try {
      const providerId = user.serviceProvider.id;
      const response = await fetch(`/api/providers/${providerId}/queue`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ queueEnabled: !queueData?.queueEnabled }),
      });

      if (response.ok) {
        fetchQueueData();
      }
    } catch (error) {
      console.error('Error toggling queue:', error);
    }
  };

  const updateTokenStatus = async (tokenId: string, status: string) => {
    try {
      const response = await fetch(`/api/queue/${tokenId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchQueueData();
      }
    } catch (error) {
      console.error('Error updating token status:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const waitingTokens = queueData?.tokens.filter(t => t.status === 'waiting') || [];
  const servingToken = queueData?.tokens.find(t => t.status === 'serving');
  const completedTokens = queueData?.tokens.filter(t => t.status === 'completed' || t.status === 'skipped') || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-2xl font-bold text-blue-600">
                LinkBook
              </Link>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Overview
            </Link>
            <Link href="/dashboard/bookings" className="text-gray-600 hover:text-gray-900">
              Bookings
            </Link>
            <Link href="/dashboard/services" className="text-gray-600 hover:text-gray-900">
              Services
            </Link>
            <Link href="/dashboard/queue" className="text-blue-600 font-medium">
              Queue
            </Link>
            <Link href="/dashboard/analytics" className="text-gray-600 hover:text-gray-900">
              Analytics
            </Link>
            <Link href="/dashboard/settings" className="text-gray-600 hover:text-gray-900">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>
            <p className="text-gray-600 mt-1">Manage walk-in customers</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              queueData?.queueEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              Queue {queueData?.queueEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Button
              variant={queueData?.queueEnabled ? 'danger' : 'success'}
              onClick={toggleQueue}
            >
              {queueData?.queueEnabled ? 'Disable Queue' : 'Enable Queue'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Currently Serving</p>
              <p className="text-4xl font-bold text-blue-600">
                #{queueData?.currentToken || '-'}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Waiting</p>
              <p className="text-3xl font-bold text-yellow-600">{queueData?.waitingCount || 0}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Completed Today</p>
              <p className="text-3xl font-bold text-green-600">{queueData?.completedCount || 0}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Est. Wait Time</p>
              <p className="text-3xl font-bold text-gray-900">
                {(queueData?.waitingCount || 0) * 15} min
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* QR Code */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Queue QR Code</h2>
            </CardHeader>
            <CardBody className="text-center">
              {qrCodeUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="Queue QR Code"
                    className="mx-auto mb-4 border rounded-lg"
                  />
                  <p className="text-sm text-gray-600 mb-4">
                    Print this QR code and place it at your entrance
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = 'queue-qrcode.png';
                      link.href = qrCodeUrl;
                      link.click();
                    }}
                  >
                    Download QR Code
                  </Button>
                </>
              ) : (
                <p className="text-gray-500">Loading QR code...</p>
              )}
            </CardBody>
          </Card>

          {/* Currently Serving */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Currently Serving</h2>
            </CardHeader>
            <CardBody>
              {servingToken ? (
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl font-bold text-blue-600">
                      #{servingToken.tokenNumber}
                    </span>
                  </div>
                  {servingToken.customerName && (
                    <p className="font-medium">{servingToken.customerName}</p>
                  )}
                  {servingToken.customerPhone && (
                    <p className="text-sm text-gray-600">{servingToken.customerPhone}</p>
                  )}
                  <div className="mt-4 flex gap-2 justify-center">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => updateTokenStatus(servingToken.id, 'completed')}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTokenStatus(servingToken.id, 'skipped')}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No one being served</p>
                  {waitingTokens.length > 0 && (
                    <Button
                      onClick={() => updateTokenStatus(waitingTokens[0].id, 'serving')}
                    >
                      Call Next: #{waitingTokens[0].tokenNumber}
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Waiting Queue */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Waiting ({waitingTokens.length})</h2>
            </CardHeader>
            <CardBody>
              {waitingTokens.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No one waiting</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {waitingTokens.map((tokenItem, index) => (
                    <div
                      key={tokenItem.id}
                      className="border rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-lg">#{tokenItem.tokenNumber}</span>
                        {tokenItem.customerName && (
                          <p className="text-sm text-gray-600">{tokenItem.customerName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {index === 0 && !servingToken && (
                          <Button
                            size="sm"
                            onClick={() => updateTokenStatus(tokenItem.id, 'serving')}
                          >
                            Call
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTokenStatus(tokenItem.id, 'skipped')}
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Completed Today */}
        {completedTokens.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <h2 className="text-lg font-semibold">Completed Today ({completedTokens.length})</h2>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-600 text-sm border-b">
                      <th className="pb-2">Token</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Served At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTokens.map((tokenItem) => (
                      <tr key={tokenItem.id} className="border-b">
                        <td className="py-3 font-medium">#{tokenItem.tokenNumber}</td>
                        <td className="py-3">{tokenItem.customerName || '-'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[tokenItem.status]}`}>
                            {tokenItem.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">
                          {tokenItem.servedAt
                            ? format(new Date(tokenItem.servedAt), 'h:mm a')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}
