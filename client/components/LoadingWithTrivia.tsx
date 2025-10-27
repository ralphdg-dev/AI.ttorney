import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import tw from 'tailwind-react-native-classnames';
import Colors from '../constants/Colors';

const loadingVideo = require('../assets/images/loading-state.mp4');

// Philippine Law Trivia - 25 Random Facts about Philippine Law
const PH_LAW_TRIVIAS = [
  "The Philippines cannot initiate war. The 1987 Constitution prohibits the State from initiating war. The Legislature may only declare that the Philippines is involved in a war or that a war exists. (Source: Sec. 23 (1), Article VI, 1987 Constitution)",
  "The oldest law still in effect is 105 years old. Act No. 2031 or the 'Negotiable Instruments Law' was enacted on February 03, 1911 and covers instruments such as Promissory Notes and bank checks.",
  "Banishment is an actual penalty for a person convicted with a crime. Called Destierro, the convicted criminal is prohibited from residing within a radius of 25 kilometers from their actual residence. (Source: Art. 27, Sec. 1, Chapter 3, Title 3, Book 1, Revised Penal Code)",
  "Marrying a first cousin is not considered incestuous by Philippine law, but merely contrary to public policy. (Source: Sec. 38, Family Code of the Philippines)",
  "A member of the Judiciary in lower trial courts is called a 'Judge', while those in the Court of Appeals, Supreme Court, and Sandiganbayan are called 'Justices'. (Source: Sec. 3 and Sec. 15, Chapter 1, Batas Pambansa 129)",
  "In applying for a marriage license, your age can be determined by your physical appearance if you cannot produce a birth certificate, baptismal certificate, or affidavit. (Source: Article 12, Family Code of the Philippines)",
  "You can't sue your spouse-to-be for breach of promise to marry. But you may recover the expenses for the wedding by filing a court case for damages against the guilty fiancé. (Source: Baksh v. Court of Appeals, G.R. No. 97336, February 19, 1993)",
  "To be considered born alive, a baby must have been born at least 7 months and survive within 24 hours from birth. (Source: Article 41, Chapter 2, Title 1, Book 1, Civil Code of the Philippines)",
  "You own merely a portion of your condominium unit. You merely own the interior surfaces of the perimeter walls, floors, ceilings, windows and doors, but not the structures themselves. (Source: Sec. 6 (a), Republic Act No. 4726 or The Condominium Act)",
  "All practice of professions are under the jurisdiction of the Professional Regulatory Commission, except for the practice of Law which the Supreme Court has exclusive jurisdiction. (Source: Republic Act No. 8981 or the PRC Modernization Act of 2000)",
  "It is unlawful for a dog or cat to be displayed in a pet shop for more than 14 days. (Source: Sec. 7, Department of Agriculture Administrative Order No. 21, Series of 2003)",
  "It is prohibited for stuffed animals to be displayed or sold in pet shops, veterinary clinics, or hospitals. (Source: Sec. 10 (10.5), Department of Agriculture Administrative Order No. 21, Series of 2003)",
  "The 'S.S' on top of documents that are notarized stands for 'Scilicet' which is Latin for 'it is permitted'. (Source: Hob. 171; 1 P. Wms. 18; Co. Litt. 180b, note 1)",
  "Lawyers are prohibited from advertising themselves or their legal services. The practice of law is not a business or money-making venture, but a dignified profession. (Source: Atty. Khan, Jr. v. Atty. Simbillo, A.C. No. 5299. August 19, 2003)",
  "A foreign absolute divorce decree may be recognized and enforced in the Philippines when it is the foreigner who obtained the divorce, not the Filipino spouse. (Source: Article 26, paragraph 2, Family Code of the Philippines)",
  "A Search Warrant is valid for ten days, while a Warrant of Arrest has no expiration date. (Sources: Sec. 10, Rule 126, Rules of Court; People of the Philippines v. Givera, G.R. No. 132159. January 18, 2001)",
  "Pregnant or nursing night workers cannot be dismissed if their actions were brought about by child rearing activities during the period before and after childbirth, for at least sixteen (16) weeks. (Source: Article 158, Chapter V, Book Three, Title III, Labor Code of the Philippines as amended by Republic Act No. 10151)",
  "There are 2.91 billion pieces of notes valued at ₱913.001 billion and 25.59 billion pieces of coins valued at ₱28.78 billion in circulation as of September 30, 2016. (Source: Currency Management Sub-Sector, Banko Sentral ng Pilipinas)",
  "While the Philippine Peso is the only legal currency in the Philippines, you may agree to settle an obligation or transaction in any other currency at the time of payment. (Source: Sec. 1, Republic Act No. 8183)",
  "Lethal Injection was the only prescribed mode of execution for death convicts before the death penalty was repealed by Republic Act 9346 on June 24, 2006. (Source: Sec. 2 (b), Rules and Regulations implementing Republic Act No. 8177)",
  "A death sentence was carried out not earlier than one (1) year nor later than eighteen (18) months after the Judgment became final and executory. (Source: Sec. 1, Republic Act No. 8177)",
  "A death row convict was only notified of his execution after sunrise of the day of his execution. (Source: Sec. 16, Rules and Regulations implementing Republic Act No. 8177)",
  "There is only one recognized form of a Last Will and Testament – a written form. This is because recording technology was limited when the Civil Code was drafted in 1947. (Source: Article 804, Civil Code of the Philippines)",
  "A Centenarian (100 year old) Filipino citizen shall be awarded a cash award of ₱100,000.00 from the National government and an undetermined amount from the local government. (Source: Sec. 4.0 (4.3), DILG Memorandum Circular No. 2016-160, November 3, 2016)",
  "A car dealer is obligated to pay you transportation allowance or provide you with a service vehicle during the repair of your brand new car under the Philippine Lemon Law. (Source: Sec. 7, Republic Act No. 10642 or The Philippine Lemon Law)",
];

interface LoadingWithTriviaProps {
  message?: string;
  showTrivia?: boolean;
}

export const LoadingWithTrivia: React.FC<LoadingWithTriviaProps> = ({ 
  message, 
  showTrivia = true 
}) => {
  const displayMessage = message || "LOADING...";
  const [currentTrivia, setCurrentTrivia] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    // Select random trivia on mount
    const randomTrivia = PH_LAW_TRIVIAS[Math.floor(Math.random() * PH_LAW_TRIVIAS.length)];
    setCurrentTrivia(randomTrivia);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Loading Video */}
      <Animated.View style={[styles.videoContainer, { opacity: fadeAnim }]}>
        <Video
          ref={videoRef}
          source={loadingVideo}
          style={styles.loadingVideo}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping
          isMuted
        />
      </Animated.View>

      {/* Loading Message */}
      <Text style={styles.loadingText}>{displayMessage}</Text>

      {/* Trivia Section */}
      {showTrivia && currentTrivia && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.triviaText}>{currentTrivia}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 40,
  },
  videoContainer: {
    width: 150,
    height: 150,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingVideo: {
    width: 150,
    height: 150,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 2,
    marginTop: 10,
    marginBottom: 40,
  },
  triviaText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text.primary,
    textAlign: 'center',
    fontWeight: '400',
    maxWidth: 400,
    paddingHorizontal: 20,
  },
});

export default LoadingWithTrivia;