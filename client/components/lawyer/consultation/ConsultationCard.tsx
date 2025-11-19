import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Video, MapPin, Calendar } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import { getStatusColor, getModeColor, getClientName, formatConsultationDate } from '../../../utils/consultationStyles';

interface ConsultationCardProps {
  consultation: {
    id: string;
    status: string;
    consultation_mode: string | null;
    consultation_date: string | null;
    message: string;
    users?: {
      first_name: string;
      last_name: string;
    };
    client_name?: string;
  };
  onPress: (id: string) => void;
  isLast?: boolean;
}

/**
 * Reusable consultation card component (DRY principle)
 * Used in dashboard and consultation list views
 */
const ConsultationCard: React.FC<ConsultationCardProps> = ({ 
  consultation, 
  onPress, 
  isLast = false 
}) => {
  const statusStyle = getStatusColor(consultation.status);
  const modeStyle = getModeColor(consultation.consultation_mode);
  const clientName = getClientName(consultation);

  return (
    <TouchableOpacity 
      style={[
        tw`bg-white rounded-2xl border border-gray-200 p-4`, 
        { marginBottom: isLast ? 0 : 16 }
      ]} 
      activeOpacity={0.92}
      onPress={() => onPress(consultation.id)}
    >
      {/* Header */}
      <View style={tw`flex-row items-start justify-between mb-3`}>
        <View style={tw`flex-1 mr-3`}>
          <Text style={tw`text-base font-semibold text-gray-900 mb-1`}>
            {clientName}
          </Text>
          <Text style={tw`text-sm text-gray-600`} numberOfLines={2}>
            {consultation.message}
          </Text>
        </View>
        
        <View style={[
          tw`px-3 py-1 rounded-full`,
          { backgroundColor: statusStyle.bg }
        ]}>
          <Text style={[
            tw`text-xs font-semibold uppercase`,
            { color: statusStyle.text }
          ]}>
            {consultation.status}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={tw`flex-row items-center justify-between`}>
        <View style={[
          tw`flex-row items-center px-2 py-1 rounded-full`,
          { backgroundColor: modeStyle.bg }
        ]}>  
          {consultation.consultation_mode === 'online' && <Video size={12} color={modeStyle.text} />}
          {consultation.consultation_mode === 'onsite' && <MapPin size={12} color={modeStyle.text} />}
          <Text style={[
            tw`text-xs font-medium ml-1 capitalize`,
            { color: modeStyle.text }
          ]}>
            {consultation.consultation_mode || 'N/A'}
          </Text>
        </View>
        
        {consultation.consultation_date && (
          <View style={tw`flex-row items-center`}>
            <Calendar size={12} color="#6B7280" />
            <Text style={tw`text-xs text-gray-500 ml-1`}>
              {formatConsultationDate(consultation.consultation_date)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ConsultationCard;
