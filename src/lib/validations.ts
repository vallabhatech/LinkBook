import { z } from 'zod';

// User registration schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

// User login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Service Provider schema
export const serviceProviderSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  category: z.enum(['salon', 'clinic', 'spa', 'other']),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

// Working Hours schema
export const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  breakStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format').nullable().optional(),
  breakEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format').nullable().optional(),
});

// Service schema
export const serviceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  durationMinutes: z.number().min(5, 'Duration must be at least 5 minutes'),
  active: z.boolean().optional(),
});

// Staff schema
export const staffSchema = z.object({
  name: z.string().min(2, 'Staff name must be at least 2 characters'),
  role: z.string().optional(),
  active: z.boolean().optional(),
});

// Booking schema
export const bookingSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID'),
  staffId: z.string().uuid('Invalid staff ID').optional(),
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
});

// Booking status update schema
export const bookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'rejected', 'completed', 'no_show']),
});

// Queue token schema
export const queueTokenSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

// Queue token status update schema
export const queueStatusSchema = z.object({
  status: z.enum(['waiting', 'serving', 'completed', 'skipped']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ServiceProviderInput = z.infer<typeof serviceProviderSchema>;
export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;
export type QueueTokenInput = z.infer<typeof queueTokenSchema>;
export type QueueStatusInput = z.infer<typeof queueStatusSchema>;
