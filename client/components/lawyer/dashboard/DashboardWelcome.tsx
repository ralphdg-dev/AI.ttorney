import React, { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Calendar } from 'lucide-react-native';
import tw from 'tailwind-react-native-classnames';

interface DashboardWelcomeProps {
  date: string;
  lawyerName?: string;
}

/**
 * DashboardWelcome - Presentational component
 * Industry standard: Small, focused, reusable component
 */
const DashboardWelcome: React.FC<DashboardWelcomeProps> = memo(({ date, lawyerName = 'Attorney' }) => {
  // Memoize greeting to avoid recalculation on every render
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    
    // Witty time-based greetings
    if (hour >= 5 && hour < 12) {
      const morningGreetings = [
        'Rise and shine',
        'Good morning',
        'Time to make justice happen',
        'Ready to win some cases',
      ];
      return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
    } else if (hour >= 12 && hour < 17) {
      const afternoonGreetings = [
        'Good afternoon',
        'Justice never sleeps',
        'Afternoon, counselor',
        'Let\'s keep the momentum going',
      ];
      return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
    } else if (hour >= 17 && hour < 21) {
      const eveningGreetings = [
        'Good evening',
        'Wrapping up the day',
        'Evening, counselor',
        'Almost time to rest your case',
      ];
      return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
    } else {
      const lateGreetings = [
        'Burning the midnight oil',
        'Working late',
        'Dedication at its finest',
        'The law never sleeps',
      ];
      return lateGreetings[Math.floor(Math.random() * lateGreetings.length)];
    }
  }, []); // Only calculate once per mount

  // Memoize formatted name
  const formattedName = useMemo(() => {
    const nameParts = lawyerName.trim().split(' ');
    if (nameParts.length === 0) return 'Attorney';
    
    // Get the last name (last part of the name)
    const lastName = nameParts[nameParts.length - 1];
    return `Atty. ${lastName}`;
  }, [lawyerName]);

  return (
    <View style={tw`mx-6 mt-6 mb-6 p-6 bg-white rounded-2xl border border-gray-200`}>
      <View style={tw`flex-row items-center mb-3`}>
        <Calendar size={16} color="#6B7280" />
        <Text style={tw`text-sm text-gray-600 font-medium ml-2`}>{date}</Text>
      </View>
      
      <Text style={tw`text-2xl font-bold text-gray-900 mb-2`}>
        {greeting}, {formattedName}
      </Text>
      <Text style={tw`text-gray-600 text-base`}>
        Here&apos;s what&apos;s happening with your practice today
      </Text>
    </View>
  );
});

DashboardWelcome.displayName = 'DashboardWelcome';

export default DashboardWelcome;
