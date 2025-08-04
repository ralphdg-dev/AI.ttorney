import { View, Text, Image } from 'react-native';
import tw from 'tailwind-react-native-classnames';
import Colors from '../../constants/Colors';

interface OnboardingSlideProps {
  image: any;
  title: string;
  description: string;
  imageStyle?: any;
}

export default function OnboardingSlide({ 
  image, 
  title, 
  description, 
  imageStyle = tw`w-72 h-72 mb-0` 
}: OnboardingSlideProps) {
  return (
    <View style={tw`flex-1 justify-center items-center px-6`}>
      <Image 
        source={image}
        style={imageStyle}
        resizeMode="contain"
        fadeDuration={0}
      />
      <Text style={[tw`text-2xl font-bold text-center mb-2`, { color: Colors.text.head }]}>
        {title}
      </Text>
      <Text style={[tw`text-lg text-center mb-8 px-4`, { color: Colors.text.sub, lineHeight: 23 }]}>
        {description}
      </Text>
    </View>
  );
} 