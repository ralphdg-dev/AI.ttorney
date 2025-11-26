/**
 * Centralized Time Utility Service
 * Handles all time format conversions and validations
 * Maintains 24h format for backend, 12h format for display
 */

export interface TimeSlot {
  hour: number;
  minute: number;
  time24h: string;
  time12h: string;
}

export default class TimeUtils {
  /**
   * Convert 24h time format (09:00) to 12h format (9:00 AM)
   */
  static convertTo12h(time24h: string): string {
    try {
      const [hour, minute] = time24h.split(':');
      const hourInt = parseInt(hour, 10);
      
      if (hourInt === 0) {
        return `12:${minute} AM`;
      } else if (hourInt < 12) {
        return `${hourInt}:${minute} AM`;
      } else if (hourInt === 12) {
        return `12:${minute} PM`;
      } else {
        return `${hourInt - 12}:${minute} PM`;
      }
    } catch (error) {
      console.error('Error converting time to 12h format:', error);
      return time24h;
    }
  }

  /**
   * Convert 12h time format (9:00 AM) to 24h format (09:00)
   */
  static convertTo24h(time12h: string): string {
    try {
      const timeStr = time12h.toUpperCase().trim();
      const isPM = timeStr.includes('PM');
      const isAM = timeStr.includes('AM');
      
      if (!isPM && !isAM) {
        // Assume 24h format if no AM/PM
        return timeStr;
      }
      
      const timeClean = timeStr.replace(/AM|PM/g, '').trim();
      const [hourStr, minute] = timeClean.split(':');
      let hour = parseInt(hourStr, 10);
      
      if (isPM && hour !== 12) {
        hour += 12;
      } else if (isAM && hour === 12) {
        hour = 0;
      }
      
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    } catch (error) {
      console.error('Error converting time to 24h format:', error);
      return time12h;
    }
  }

  /**
   * Generate available time slots for a range
   * Returns array of time strings in 24h format
   */
  static generateTimeSlots(startHour: number = 9, endHour: number = 17, intervalMinutes: number = 30): string[] {
    const slots: string[] = [];
    let currentHour = startHour;
    
    while (currentHour < endHour) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        if (currentHour === endHour && minute > 0) break;
        const time24h = `${currentHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time24h);
      }
      currentHour++;
    }
    
    return slots;
  }

  /**
   * Get time options for UI (display in 12h, store in 24h)
   */
  static getTimeOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    
    for (let h = 0; h < 24; h++) {
      for (let m of [0, 30]) {
        if (h === 24 && m === 30) break;
        const value24h = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const label12h = this.convertTo12h(value24h);
        options.push({ value: value24h, label: label12h });
      }
    }
    
    return options;
  }

  /**
   * Validate time slot format
   */
  static isValidTimeSlot(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Parse hours_available data from various formats
   * Handles both JSONB object and legacy string formats
   */
  static parseHoursAvailable(hoursAvailable: any): Record<string, string[]> {
    if (!hoursAvailable) return {};
    
    // JSONB format: {"Monday": ["09:00", "11:00"]}
    if (typeof hoursAvailable === 'object' && !Array.isArray(hoursAvailable)) {
      return hoursAvailable;
    }
    
    // Legacy string format: "Monday= 9:00 AM, 11:00 AM;Tuesday= 2:00 PM"
    if (typeof hoursAvailable === 'string') {
      const parsed: Record<string, string[]> = {};
      const dayEntries = hoursAvailable.split(';');
      
      dayEntries.forEach((entry) => {
        if (entry.trim()) {
          const parts = entry.split('=').map((s) => s.trim());
          if (parts.length === 2) {
            const day = parts[0];
            const times = parts[1].split(',').map((t) => t.trim());
            parsed[day] = times.map((time) => this.convertTo24h(time));
          }
        }
      });
      
      return parsed;
    }
    
    // Legacy array format
    if (Array.isArray(hoursAvailable)) {
      const parsed: Record<string, string[]> = {};
      hoursAvailable.forEach((item: any) => {
        if (typeof item === 'string' && item.includes('=')) {
          const [day, times] = item.split('=').map((s) => s.trim());
          if (day && times) {
            parsed[day] = times.split(',').map((t) => this.convertTo24h(t.trim()));
          }
        }
      });
      return parsed;
    }
    
    return {};
  }

  /**
   * Format hours_available for backend (always JSONB format)
   */
  static formatHoursAvailableForBackend(hoursAvailable: Record<string, string[]>): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    
    Object.entries(hoursAvailable).forEach(([day, times]) => {
      formatted[day] = times.map((time) => {
        // Ensure all times are in 24h format
        if (this.isValidTimeSlot(time)) {
          return time;
        } else {
          return this.convertTo24h(time);
        }
      });
    });
    
    return formatted;
  }

  /**
   * Get available times for today from hours_available
   */
  static getTodayAvailableTimes(hoursAvailable: any): string[] {
    const today = new Date().toLocaleString('en-US', { weekday: 'long' });
    const parsed = this.parseHoursAvailable(hoursAvailable);
    return parsed[today] || [];
  }

  /**
   * Check if a time slot is available for a specific day
   */
  static isTimeSlotAvailable(hoursAvailable: any, day: string, timeSlot: string): boolean {
    const parsed = this.parseHoursAvailable(hoursAvailable);
    const daySlots = parsed[day] || [];
    return daySlots.includes(timeSlot);
  }
}

// Single default export - no conflicts
