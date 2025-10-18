import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, Clock, Video, MapPin, X } from 'lucide-react-native';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalCloseButton, ModalBody } from '../../ui/modal';
import Colors from '../../../constants/Colors';
import tw from 'tailwind-react-native-classnames';

interface ConsultationCalendarProps {
  consultations?: {
    id: string;
    consultation_date: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
    mode: 'online' | 'onsite';
    client_name?: string;
    consultation_time?: string;
    message?: string;
  }[];
  onDatePress?: (date: string) => void;
  onConsultationPress?: (consultationId: string) => void;
}

const ConsultationCalendar: React.FC<ConsultationCalendarProps> = ({ 
  consultations = [], 
  onDatePress,
  onConsultationPress 
}) => {
  // Initialize with Philippine timezone
  const getPhilippineDate = () => {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
  };
  
  const [currentDate, setCurrentDate] = useState(getPhilippineDate());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateConsultations, setSelectedDateConsultations] = useState<typeof consultations>([]);

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    setCurrentDate(newDate);
  };

  // Get consultations for a specific date (only accepted)
  const getConsultationsForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return consultations.filter(c => 
      c.consultation_date === dateStr && 
      c.status === 'accepted'
    );
  };

  // Get indicator style based on consultations
  const getDateIndicator = (day: number) => {
    const dayConsultations = getConsultationsForDate(day);
    if (dayConsultations.length === 0) return null;

    // Only accepted consultations
    return { color: Colors.primary.blue, count: dayConsultations.length };
  };

  // Check if date is today (Philippine timezone)
  const isToday = (day: number) => {
    const today = getPhilippineDate();
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  // Handle date press
  const handleDatePress = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayConsultations = getConsultationsForDate(day);
    
    if (dayConsultations.length > 0) {
      setSelectedDate(dateStr);
      setSelectedDateConsultations(dayConsultations);
      setShowModal(true);
    }
  };

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
      case 'accepted':
        return { bg: '#E8F4FD', text: Colors.primary.blue, border: Colors.primary.blue };
      default:
        return { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' };
    }
  };

  // Get mode styling
  const getModeStyle = (mode: string) => {
    switch (mode) {
      case 'online':
        return { bg: '#E8F4FD', text: Colors.primary.blue };
      case 'onsite':
        return { bg: '#F0FDF4', text: '#16A34A' };
      default:
        return { bg: '#F3F4F6', text: '#374151' };
    }
  };


  return (
    <View style={tw`bg-white rounded-2xl border border-gray-200 p-6`}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-center mb-6`}>
        <View style={tw`flex-row items-center`}>
          <Calendar size={20} color={Colors.primary.blue} />
          <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>
            Accepted Consultations
          </Text>
        </View>
        <Text style={tw`text-sm text-gray-500`}>
          {consultations.filter(c => c.status === 'accepted').length} scheduled
        </Text>
      </View>

      {/* Month Navigation */}
      <View style={tw`flex-row justify-between items-center mb-6`}>
        <TouchableOpacity
          onPress={() => navigateMonth('prev')}
          style={tw`w-10 h-10 rounded-lg bg-gray-50 justify-center items-center`}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color="#6B7280" />
        </TouchableOpacity>

        <Text style={tw`text-xl font-bold text-gray-900`}>
          {monthNames[currentMonth]} {currentYear}
        </Text>

        <TouchableOpacity
          onPress={() => navigateMonth('next')}
          style={tw`w-10 h-10 rounded-lg bg-gray-50 justify-center items-center`}
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={tw`flex-row mb-2`}>
        {dayNames.map((day) => (
          <View key={day} style={tw`flex-1 h-8 justify-center items-center`}>
            <Text style={tw`text-xs font-semibold text-gray-500 uppercase`}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View>
        {Array.from({ length: Math.ceil((startingDayOfWeek + daysInMonth) / 7) }, (_, weekIndex) => (
          <View key={weekIndex} style={tw`flex-row`}>
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const dayNumber = weekIndex * 7 + dayIndex - startingDayOfWeek + 1;
              
              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return <View key={dayIndex} style={tw`flex-1 h-12`} />;
              }
              
              const indicator = getDateIndicator(dayNumber);
              const today = isToday(dayNumber);
              
              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    tw`flex-1 h-12 justify-center items-center relative`,
                    today && tw`bg-blue-50 rounded-lg`
                  ]}
                  onPress={() => handleDatePress(dayNumber)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    tw`text-sm font-medium`,
                    today ? tw`text-blue-600 font-bold` : tw`text-gray-900`
                  ]}>
                    {dayNumber}
                  </Text>
                  
                  {/* Consultation indicator */}
                  {indicator && (
                    <View style={tw`absolute bottom-1 flex-row justify-center items-center`}>
                      <View style={[
                        tw`w-1.5 h-1.5 rounded-full`,
                        { backgroundColor: indicator.color }
                      ]} />
                      {indicator.count > 1 && (
                        <View style={[
                          tw`w-4 h-4 rounded-full justify-center items-center ml-1`,
                          { backgroundColor: indicator.color }
                        ]}>
                          <Text style={tw`text-xs font-bold text-white`}>
                            {indicator.count > 9 ? '9+' : indicator.count}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={tw`mt-6 pt-4 border-t border-gray-100`}>
        <Text style={tw`text-sm font-semibold text-gray-700 mb-3`}>Legend</Text>
        <View style={tw`flex-row flex-wrap`}>
          <View style={tw`flex-row items-center mr-4 mb-2`}>
            <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: Colors.primary.blue }]} />
            <Text style={tw`text-xs text-gray-600`}>Accepted Consultations</Text>
          </View>
        </View>
      </View>

      {/* Consultation Details Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
        <ModalBackdrop />
        <ModalContent style={tw`bg-white rounded-2xl`}>
          <ModalHeader style={tw`px-4 py-3 border-b border-gray-100`}>
            <View style={tw`flex-row items-center justify-between flex-1`}>
              <View style={tw`flex-row items-center`}>
                <Calendar size={18} color={Colors.primary.blue} />
                <Text style={tw`text-base font-bold text-gray-900 ml-2`}>
                  {selectedDate && formatDisplayDate(selectedDate)}
                </Text>
              </View>
              <ModalCloseButton>
                <X size={18} color="#6B7280" />
              </ModalCloseButton>
            </View>
          </ModalHeader>
          
          <ModalBody style={tw`p-0`}>
            <ScrollView style={tw`max-h-80`} showsVerticalScrollIndicator={false}>
              <View style={tw`px-4 py-3`}>
                {selectedDateConsultations.map((consultation, index) => {
                  const statusStyle = getStatusStyle(consultation.status);
                  const modeStyle = getModeStyle(consultation.mode);
                  
                  return (
                    <TouchableOpacity
                      key={consultation.id}
                      style={[
                        tw`bg-gray-50 rounded-xl p-3 border border-gray-200`,
                        { marginBottom: index < selectedDateConsultations.length - 1 ? 8 : 0 }
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setShowModal(false);
                        onConsultationPress?.(consultation.id);
                      }}
                    >
                      {/* Header */}
                      <View style={tw`flex-row items-start justify-between mb-2`}>
                        <View style={tw`flex-1 mr-2`}>
                          <Text style={tw`text-sm font-semibold text-gray-900 mb-1`}>
                            {consultation.client_name || 'Client'}
                          </Text>
                          {consultation.consultation_time && (
                            <View style={tw`flex-row items-center`}>
                              <Clock size={12} color="#6B7280" />
                              <Text style={tw`text-xs text-gray-600 ml-1`}>
                                {formatTime(consultation.consultation_time)}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        <View style={[
                          tw`px-2 py-1 rounded-full border`,
                          { 
                            backgroundColor: statusStyle.bg,
                            borderColor: statusStyle.border
                          }
                        ]}>
                          <Text style={[
                            tw`text-xs font-medium uppercase`,
                            { color: statusStyle.text }
                          ]}>
                            {consultation.status}
                          </Text>
                        </View>
                      </View>

                      {/* Message */}
                      {consultation.message && (
                        <Text style={tw`text-xs text-gray-700 mb-2 leading-4`} numberOfLines={2}>
                          {consultation.message}
                        </Text>
                      )}

                      {/* Footer */}
                      <View style={tw`flex-row items-center justify-between`}>
                        <View style={[
                          tw`flex-row items-center px-2 py-1 rounded-full`,
                          { backgroundColor: modeStyle.bg }
                        ]}>
                          {consultation.mode === 'online' && <Video size={10} color={modeStyle.text} />}
                          {consultation.mode === 'onsite' && <MapPin size={10} color={modeStyle.text} />}
                          <Text style={[
                            tw`text-xs font-medium ml-1 capitalize`,
                            { color: modeStyle.text }
                          ]}>
                            {consultation.mode}
                          </Text>
                        </View>
                        
                        <Text style={tw`text-xs text-gray-400`}>Tap to view →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                
                {selectedDateConsultations.length === 0 && (
                  <View style={tw`py-6 items-center`}>
                    <Calendar size={32} color="#D1D5DB" />
                    <Text style={tw`text-gray-500 mt-2 text-center text-sm`}>
                      No consultations scheduled
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </ModalBody>
        </ModalContent>
      </Modal>
    </View>
  );
};

export default ConsultationCalendar;
