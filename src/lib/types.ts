export interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface BlockedDate {
  id: string;
  date: string;
  created_at: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  ref_code: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  address: string;
  notes: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface BookingResult {
  success: boolean;
  ref_code: string;
  error_message: string;
}
