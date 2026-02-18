'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Input, Select, Textarea } from '@/components/Input';
import { Card, CardBody, CardHeader } from '@/components/Card';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const DEFAULT_WORKING_HOURS = {
  openTime: '09:00',
  closeTime: '18:00',
  breakStart: '13:00',
  breakEnd: '14:00',
};

interface WorkingHoursForm {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
}

interface ServiceForm {
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, refreshUser, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Business Details
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('salon');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');

  // Step 2: Working Hours
  const [workingHours, setWorkingHours] = useState<WorkingHoursForm[]>(
    DAYS_OF_WEEK.map((day) => ({
      dayOfWeek: day.value,
      isOpen: day.value !== 0, // Sunday closed by default
      ...DEFAULT_WORKING_HOURS,
    }))
  );

  // Step 3: Services
  const [services, setServices] = useState<ServiceForm[]>([
    { name: '', description: '', price: '', durationMinutes: '30' },
  ]);

  // Store provider ID after creation
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Auto-generate slug from business name
    const generated = businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setSlug(generated);
  }, [businessName]);

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessName,
          category,
          description,
          address,
          phone,
          email,
          slug,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create business');
      }

      const data = await response.json();
      setProviderId(data.provider.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkingHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/providers/${providerId}/working-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          workingHours.map((wh) => ({
            ...wh,
            breakStart: wh.isOpen ? wh.breakStart : null,
            breakEnd: wh.isOpen ? wh.breakEnd : null,
          }))
        ),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save working hours');
      }

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save working hours');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Filter out empty services
      const validServices = services.filter(
        (s) => s.name && s.price && s.durationMinutes
      );

      if (validServices.length === 0) {
        throw new Error('Please add at least one service');
      }

      for (const service of validServices) {
        const response = await fetch(`/api/providers/${providerId}/services`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            durationMinutes: parseInt(service.durationMinutes),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add service');
        }
      }

      // Refresh user data and redirect to dashboard
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add services');
    } finally {
      setIsLoading(false);
    }
  };

  const updateWorkingHours = (dayOfWeek: number, field: string, value: string | boolean) => {
    setWorkingHours((prev) =>
      prev.map((wh) =>
        wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh
      )
    );
  };

  const addService = () => {
    setServices([...services, { name: '', description: '', price: '', durationMinutes: '30' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, value: string) => {
    setServices(
      services.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      )
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Set Up Your Business</h1>
          <p className="text-gray-600 mt-2">Complete these steps to start accepting bookings</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 ${
                      step > s ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Business Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Business Details</h2>
              <p className="text-gray-600 text-sm">Tell us about your business</p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleBusinessSubmit} className="space-y-4">
                <Input
                  label="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  placeholder="Golden Salon"
                />

                <Select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'salon', label: 'Salon' },
                    { value: 'clinic', label: 'Clinic' },
                    { value: 'spa', label: 'Spa' },
                    { value: 'other', label: 'Other' },
                  ]}
                />

                <Input
                  label="Booking Link Slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  placeholder="golden-salon"
                />
                <p className="text-sm text-gray-500 -mt-2">
                  Your booking link will be: {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/{slug || 'your-slug'}
                </p>

                <Textarea
                  label="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your business..."
                  rows={3}
                />

                <Input
                  label="Address (optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, City"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone (optional)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                  <Input
                    label="Email (optional)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@business.com"
                  />
                </div>

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Continue
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Step 2: Working Hours */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Working Hours</h2>
              <p className="text-gray-600 text-sm">Set your business hours for each day</p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleWorkingHoursSubmit} className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const wh = workingHours.find((w) => w.dayOfWeek === day.value)!;
                  return (
                    <div key={day.value} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">{day.label}</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={wh.isOpen}
                            onChange={(e) =>
                              updateWorkingHours(day.value, 'isOpen', e.target.checked)
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm">Open</span>
                        </label>
                      </div>
                      {wh.isOpen && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600">Open</label>
                            <input
                              type="time"
                              value={wh.openTime}
                              onChange={(e) =>
                                updateWorkingHours(day.value, 'openTime', e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Close</label>
                            <input
                              type="time"
                              value={wh.closeTime}
                              onChange={(e) =>
                                updateWorkingHours(day.value, 'closeTime', e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Break Start</label>
                            <input
                              type="time"
                              value={wh.breakStart}
                              onChange={(e) =>
                                updateWorkingHours(day.value, 'breakStart', e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Break End</label>
                            <input
                              type="time"
                              value={wh.breakEnd}
                              onChange={(e) =>
                                updateWorkingHours(day.value, 'breakEnd', e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" isLoading={isLoading}>
                    Continue
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Step 3: Services */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Services</h2>
              <p className="text-gray-600 text-sm">Add the services you offer</p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleServicesSubmit} className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium">Service {index + 1}</span>
                      {services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3">
                      <Input
                        label="Service Name"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        placeholder="e.g., Haircut"
                        required
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Price (₹)"
                          type="number"
                          value={service.price}
                          onChange={(e) => updateService(index, 'price', e.target.value)}
                          placeholder="100"
                          min="0"
                          required
                        />
                        <Select
                          label="Duration"
                          value={service.durationMinutes}
                          onChange={(e) =>
                            updateService(index, 'durationMinutes', e.target.value)
                          }
                          options={[
                            { value: '15', label: '15 minutes' },
                            { value: '30', label: '30 minutes' },
                            { value: '45', label: '45 minutes' },
                            { value: '60', label: '1 hour' },
                            { value: '90', label: '1.5 hours' },
                            { value: '120', label: '2 hours' },
                          ]}
                        />
                      </div>
                      <Textarea
                        label="Description (optional)"
                        value={service.description}
                        onChange={(e) => updateService(index, 'description', e.target.value)}
                        placeholder="Brief description of the service..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addService}
                  className="w-full"
                >
                  + Add Another Service
                </Button>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" isLoading={isLoading}>
                    Complete Setup
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
