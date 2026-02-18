'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { format } from 'date-fns';

interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: {
    name: string;
    price: number;
  };
}

interface Provider {
  id: string;
  businessName: string;
  slug: string;
  queueEnabled: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  no_show: 'bg-gray-100 text-gray-800',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token || !user?.serviceProvider) return;

    try {
      const providerId = user.serviceProvider.id;

      // Fetch provider data
      const providerRes = await fetch(`/api/providers/${providerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (providerRes.ok) {
        const data = await providerRes.json();
        setProvider(data.provider);
      }

      // Fetch today's bookings
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayRes = await fetch(
        `/api/providers/${providerId}/bookings?date=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (todayRes.ok) {
        const data = await todayRes.json();
        setTodayBookings(data.bookings);
      }

      // Fetch upcoming bookings (next 7 days)
      const endDate = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const upcomingRes = await fetch(
        `/api/providers/${providerId}/bookings?startDate=${today}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (upcomingRes.ok) {
        const data = await upcomingRes.json();
        setUpcomingBookings(data.bookings.filter((b: Booking) => b.date !== today));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
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
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const bookingUrl = `${appUrl}/book/${provider?.slug}`;

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
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.name}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3">
            <Link href="/dashboard" className="text-blue-600 font-medium">
              Overview
            </Link>
            <Link href="/dashboard/bookings" className="text-gray-600 hover:text-gray-900">
              Bookings
            </Link>
            <Link href="/dashboard/services" className="text-gray-600 hover:text-gray-900">
              Services
            </Link>
            <Link href="/dashboard/queue" className="text-gray-600 hover:text-gray-900">
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {provider?.businessName}
          </h1>
          <p className="text-gray-600 mt-1">Here&apos;s your booking overview for today</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Today&apos;s Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{todayBookings.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">
                {todayBookings.filter((b) => b.status === 'pending').length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Confirmed</p>
              <p className="text-3xl font-bold text-green-600">
                {todayBookings.filter((b) => b.status === 'confirmed').length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-gray-600 text-sm">Upcoming (7 days)</p>
              <p className="text-3xl font-bold text-blue-600">{upcomingBookings.length}</p>
            </CardBody>
          </Card>
        </div>

        {/* Booking Link */}
        <Card className="mb-8">
          <CardBody>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Your Booking Link</h3>
                <p className="text-blue-600 break-all">{bookingUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(bookingUrl)}
                >
                  Copy Link
                </Button>
                <Link href={`/book/${provider?.slug}`} target="_blank">
                  <Button size="sm">Preview</Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Today's Bookings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Today&apos;s Bookings</h2>
            </CardHeader>
            <CardBody>
              {todayBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No bookings for today</p>
              ) : (
                <div className="space-y-4">
                  {todayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-sm text-gray-600">{booking.service.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </p>
                        <p className="text-sm text-gray-500">{booking.customerPhone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[booking.status]
                          }`}
                        >
                          {booking.status}
                        </span>
                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => updateBookingStatus(booking.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Upcoming Bookings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
            </CardHeader>
            <CardBody>
              {upcomingBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No upcoming bookings</p>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-sm text-gray-600">{booking.service.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.date), 'MMM d, yyyy')} at{' '}
                          {formatTime(booking.startTime)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[booking.status]
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                  {upcomingBookings.length > 5 && (
                    <Link href="/dashboard/bookings">
                      <Button variant="outline" className="w-full">
                        View All Bookings
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}
