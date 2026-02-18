'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { format, addDays } from 'date-fns';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
}

interface WorkingHours {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

interface Provider {
  id: string;
  businessName: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  slug: string;
  workingHours: WorkingHours[];
  services: Service[];
}

interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

type BookingPageProps = {
  params: Promise<{ slug: string }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  salon: 'Salon',
  clinic: 'Clinic',
  spa: 'Spa',
  other: 'Service Provider',
};

export default function BookingPage({ params }: BookingPageProps) {
  const { slug } = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await fetch(`/api/public/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setProvider(data.provider);
        } else {
          setError('Provider not found');
        }
      } catch {
        setError('Failed to load provider');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProvider();
  }, [slug]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService, selectedDate]);

  const fetchSlots = async () => {
    if (!selectedService || !selectedDate) return;

    setSlotsLoading(true);
    try {
      const response = await fetch(
        `/api/public/${slug}/slots?serviceId=${selectedService.id}&date=${selectedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots);
      }
    } catch {
      console.error('Failed to fetch slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot.startTime);
    setStep(3);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/public/${slug}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: selectedService?.id,
          date: selectedDate,
          startTime: selectedSlot,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        setBookingSuccess(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create booking');
      }
    } catch {
      setError('Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE, MMM d'),
      dayOfWeek: date.getDay(),
    };
  });

  // Filter dates based on working hours
  const openDates = availableDates.filter((date) => {
    const wh = provider?.workingHours.find((w) => w.dayOfWeek === date.dayOfWeek);
    return wh?.isOpen;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6">
              Your appointment at {provider?.businessName} has been booked successfully.
              You will receive a confirmation soon.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="font-medium">{selectedService?.name}</p>
              <p className="text-gray-600">
                {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-gray-600">
                {selectedSlot && formatTime(selectedSlot)}
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>Book Another</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{provider?.businessName}</h1>
          <p className="text-gray-600">{CATEGORY_LABELS[provider?.category || 'other']}</p>
          {provider?.address && (
            <p className="text-sm text-gray-500 mt-1">{provider.address}</p>
          )}
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          {[
            { num: 1, label: 'Service' },
            { num: 2, label: 'Date & Time' },
            { num: 3, label: 'Details' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s.num}
              </div>
              <span className={`ml-2 text-sm ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}>
                {s.label}
              </span>
              {i < 2 && <div className={`w-12 h-1 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pb-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Select Service */}
        {step >= 1 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Select a Service</h2>
                {selectedService && step > 1 && (
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    Change
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {step === 1 ? (
                <div className="grid gap-3">
                  {provider?.services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      className="w-full text-left border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            {service.durationMinutes} min
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">₹{service.price}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium">{selectedService?.name}</p>
                  <p className="text-sm text-gray-600">
                    ₹{selectedService?.price} • {selectedService?.durationMinutes} min
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Step 2: Select Date & Time */}
        {step >= 2 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Select Date & Time</h2>
                {selectedSlot && step > 2 && (
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    Change
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {step === 2 ? (
                <>
                  {/* Date Selection */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">Select Date</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {openDates.map((date) => (
                        <button
                          key={date.value}
                          onClick={() => handleDateSelect(date.value)}
                          className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm ${
                            selectedDate === date.value
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'hover:border-blue-500'
                          }`}
                        >
                          {date.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {selectedDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Select Time</p>
                      {slotsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No available slots for this date
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot.startTime}
                              onClick={() => handleSlotSelect(slot)}
                              className={`px-3 py-2 rounded-lg border text-sm ${
                                selectedSlot === slot.startTime
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'hover:border-blue-500'
                              }`}
                            >
                              {formatTime(slot.startTime)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium">
                    {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedSlot && formatTime(selectedSlot)}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Step 3: Customer Details */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Your Details</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="John Doe"
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  placeholder="+91 98765 43210"
                />

                <Input
                  label="Email (optional)"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <Input
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests..."
                />

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Confirm Booking
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}
