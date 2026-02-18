import { format, parse, addMinutes, isWithinInterval, parseISO, isBefore, isAfter, setHours, setMinutes } from 'date-fns';

export interface TimeSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  available: boolean;
}

export interface WorkingHoursData {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

export interface BookingData {
  date: string;
  startTime: string;
  endTime: string;
}

// Parse time string (HH:mm) to minutes from midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes from midnight to time string (HH:mm)
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Generate time slots for a given day
export function generateTimeSlots(
  workingHours: WorkingHoursData | null,
  serviceDuration: number, // in minutes
  existingBookings: BookingData[],
  date: string // YYYY-MM-DD
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  if (!workingHours || !workingHours.isOpen) {
    return slots;
  }

  const openMinutes = timeToMinutes(workingHours.openTime);
  const closeMinutes = timeToMinutes(workingHours.closeTime);
  const breakStartMinutes = workingHours.breakStart ? timeToMinutes(workingHours.breakStart) : null;
  const breakEndMinutes = workingHours.breakEnd ? timeToMinutes(workingHours.breakEnd) : null;

  let currentMinutes = openMinutes;

  while (currentMinutes + serviceDuration <= closeMinutes) {
    const slotStart = currentMinutes;
    const slotEnd = currentMinutes + serviceDuration;

    // Check if slot falls within break time
    let isInBreak = false;
    if (breakStartMinutes !== null && breakEndMinutes !== null) {
      // Slot overlaps with break if it starts before break ends and ends after break starts
      if (slotStart < breakEndMinutes && slotEnd > breakStartMinutes) {
        isInBreak = true;
      }
    }

    if (!isInBreak) {
      // Check if slot conflicts with existing bookings
      const startTime = minutesToTime(slotStart);
      const endTime = minutesToTime(slotEnd);

      const hasConflict = existingBookings.some(booking => {
        const bookingStart = timeToMinutes(booking.startTime);
        const bookingEnd = timeToMinutes(booking.endTime);
        // Conflict if slot overlaps with booking
        return slotStart < bookingEnd && slotEnd > bookingStart;
      });

      slots.push({
        startTime,
        endTime,
        available: !hasConflict
      });
    }

    // Move to next slot (increment by 15 minutes or service duration, whichever is smaller)
    const increment = Math.min(15, serviceDuration);
    currentMinutes += increment;
  }

  return slots;
}

// Check if a booking time is valid
export function isValidBookingTime(
  workingHours: WorkingHoursData | null,
  startTime: string,
  endTime: string
): boolean {
  if (!workingHours || !workingHours.isOpen) {
    return false;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const openMinutes = timeToMinutes(workingHours.openTime);
  const closeMinutes = timeToMinutes(workingHours.closeTime);

  // Check if within working hours
  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    return false;
  }

  // Check if not during break
  if (workingHours.breakStart && workingHours.breakEnd) {
    const breakStartMinutes = timeToMinutes(workingHours.breakStart);
    const breakEndMinutes = timeToMinutes(workingHours.breakEnd);
    if (startMinutes < breakEndMinutes && endMinutes > breakStartMinutes) {
      return false;
    }
  }

  return true;
}

// Calculate end time based on start time and duration
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = timeToMinutes(startTime);
  return minutesToTime(startMinutes + durationMinutes);
}

// Get day of week from date string
export function getDayOfWeek(dateString: string): number {
  const date = parseISO(dateString);
  return date.getDay();
}

// Format time for display (e.g., "10:00 AM")
export function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
