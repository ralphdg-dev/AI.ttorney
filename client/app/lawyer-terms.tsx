import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function TermsAndConditions() {
  const navigation = useNavigation();
  const [isAccepted, setIsAccepted] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAccept = () => {
    if (isAccepted) {
      // Navigate to next step or complete verification
      navigation.navigate('verification-complete');
    }
  };

  const toggleAcceptance = () => {
    setIsAccepted(!isAccepted);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBack}>
          <MaterialIcons name="arrow-back" size={26} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
      </View>

      {/* Stepper */}
      <View style={styles.stepperContainer}>
        <Text style={styles.stepperStep}>Step 4 of 4</Text>
        <Text style={styles.stepperNext}>
          Final Step: <Text style={styles.stepperNextLink}>Agreement</Text>
        </Text>
      </View>

      {/* Terms Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: January 2025</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.sectionContent}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Account Registration</Text>
          <Text style={styles.sectionContent}>
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          <Text style={styles.sectionContent}>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Privacy and Data Protection</Text>
          <Text style={styles.sectionContent}>
            Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Service Availability</Text>
          <Text style={styles.sectionContent}>
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.sectionContent}>
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
          <Text style={styles.sectionContent}>
            Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Termination</Text>
          <Text style={styles.sectionContent}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
          <Text style={styles.sectionContent}>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact Information</Text>
          <Text style={styles.sectionContent}>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Acceptance Checkbox */}
        <TouchableOpacity style={styles.checkboxContainer} onPress={toggleAcceptance}>
          <View style={[styles.checkbox, isAccepted && styles.checkboxChecked]}>
            {isAccepted && (
              <MaterialIcons name="check" size={16} color="#fff" />
            )}
          </View>
          <Text style={styles.checkboxText}>
            I have read and agree to the Terms and Conditions
          </Text>
        </TouchableOpacity>

        {/* Accept Button */}
        <TouchableOpacity 
          style={[styles.acceptButton, !isAccepted && styles.acceptButtonDisabled]} 
          onPress={handleAccept}
          disabled={!isAccepted}
        >
          <Text style={[styles.acceptButtonText, !isAccepted && styles.acceptButtonTextDisabled]}>
            Complete Verification
          </Text>
          <MaterialIcons 
            name="check-circle" 
            size={22} 
            color={isAccepted ? "#fff" : "#9ca3af"} 
            style={{ marginLeft: 8 }} 
          />
        </TouchableOpacity>
        
        {/* Stepper Dots */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, { backgroundColor: '#023D7B' }]} />
          <View style={[styles.dot, { backgroundColor: '#023D7B' }]} />
          <View style={[styles.dot, { backgroundColor: '#023D7B' }]} />
          <View style={[styles.dot, { backgroundColor: '#023D7B' }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 30 : 20,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBack: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22223b',
  },
  stepperContainer: {
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperStep: {
    fontSize: 15,
    color: '#023D7B',
    fontWeight: '500',
  },
  stepperNext: {
    fontSize: 15,
    color: '#023D7B',
  },
  stepperNextLink: {
    color: '#023D7B',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22223b',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    textAlign: 'justify',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  checkboxText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 18,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: '#023D7B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    width: '100%',
  },
  acceptButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  acceptButtonTextDisabled: {
    color: '#9ca3af',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
});
