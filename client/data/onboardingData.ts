import onboarding1 from '../assets/images/onboarding1.png';
import onboarding2 from '../assets/images/onboarding2.png';
import onboarding3 from '../assets/images/onboarding3.png';
import onboarding4 from '../assets/images/onboarding4.png';

export interface OnboardingSlideData {
  image: any;
  title: string;
  description: string;
  imageStyle?: any;
}

export const onboardingSlides: OnboardingSlideData[] = [
  {
    image: onboarding1,
    title: "Batas Para sa Lahat",
    description: "Whether you're seeking advice or giving it, Ai.ttorney makes the law easier to understand.",
    imageStyle: { width: 320, height: 320, marginBottom: 0 }
  },
  {
    image: onboarding2,
    title: "May Tanong? Chat ka Lang!",
    description: "Chat with our smart assistant for all users—anytime, anywhere, in Filipino or English.",
    imageStyle: { width: 288, height: 288, marginBottom: 0 }
  },
  {
    image: onboarding3,
    title: "Para rin sa mga Eksperto",
    description: "Lawyers can share their knowledge, support users, and help build a more accessible legal space.",
    imageStyle: { width: 288, height: 288, marginBottom: 0 }
  },
  {
    image: onboarding4,
    title: "Abot Kamay na Hustisya",
    description: "Browse legal guides, consult with pro-bono lawyers, and search for nearby law firms.",
    imageStyle: { width: 288, height: 288, marginBottom: 0 }
  }
]; 