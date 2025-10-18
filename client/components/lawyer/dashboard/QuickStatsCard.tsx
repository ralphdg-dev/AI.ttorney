import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';
import { QuickStatConfig } from '../../../constants/dashboardConfig';
import { DashboardStats } from '../../../services/lawyerDashboardService';

interface QuickStatsCardProps {
  config: QuickStatConfig;
  stats: DashboardStats;
  onPress?: () => void;
}

/**
 * QuickStatsCard - Presentational component
 * Industry standard: Pure, memoized component for performance
 */
const QuickStatsCard: React.FC<QuickStatsCardProps> = memo(({ config, stats, onPress }) => {
  const IconComponent = config.icon;
  const value = config.getValue(stats);
  const change = config.getChange(stats);

  return (
    <TouchableOpacity 
      style={tw`flex-1 px-2`} 
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={tw`bg-white p-4 rounded-2xl border border-gray-200 h-36 justify-between`}>
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={[tw`w-10 h-10 rounded-xl justify-center items-center`, { backgroundColor: config.bgColor }]}>
            <IconComponent size={18} color={config.color} strokeWidth={2.5} />
          </View>
          <View style={tw`flex-row items-center`}>
            <ArrowUpRight 
              size={12} 
              color={config.changeType === 'positive' ? '#059669' : '#DC2626'} 
              strokeWidth={2} 
            />
          </View>
        </View>
        <View style={tw`flex-1 justify-center`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-1`}>{value}</Text>
          <Text style={tw`text-xs text-gray-600 mb-1 leading-4`} numberOfLines={2}>
            {config.label}
          </Text>
        </View>
        <Text 
          style={tw`text-xs ${config.changeType === 'positive' ? 'text-green-600' : 'text-red-600'} font-medium`} 
          numberOfLines={1}
        >
          {change}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

QuickStatsCard.displayName = 'QuickStatsCard';

export default QuickStatsCard;
