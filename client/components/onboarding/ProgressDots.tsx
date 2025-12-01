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
          {/* Container with max width to allow transform scaling */}
          <View style={{ width: 24, height: 8, justifyContent: 'center', alignItems: 'center' }}>
            {/* Gray background (inactive state) */}
            <View 
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#D1D5DB',
              }}
            />
            {/* Blue foreground with animated opacity and scale (active state) */}
            <Animated.View 
              style={[
                {
                  width: 24,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: Colors.primary.blue,
                  opacity: progressAnims[index],
                  transform: [{
                    scaleX: progressAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.33, 1], // 8/24 = 0.33 to simulate 8px to 24px
                    }),
                  }],
                }
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}