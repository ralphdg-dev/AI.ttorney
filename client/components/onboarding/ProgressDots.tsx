import { View, Animated } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';

interface ProgressDotsProps {
  progressAnims: Animated.Value[];
}

export default function ProgressDots({ progressAnims }: ProgressDotsProps) {
  return (
    <View style={tw`flex-row justify-center mb-6`}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={tw`mx-1`}>
          <Animated.View 
            style={[
              tw`rounded-full`,
              {
                width: progressAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 24], // 8px dot to 24px line
                }),
                height: 8,
                backgroundColor: progressAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#D1D5DB', Colors.primary.blue], // gray to blue
                }),
              }
            ]}
          />
        </View>
      ))}
    </View>
  );
} 