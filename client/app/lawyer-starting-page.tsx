import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';

import { lawyerStartingSteps } from '../data/lawyerStartingSteps';
import { FontAwesome5 } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';


export default function LawyerStartingPage() {
  const navigation = useNavigation();
  const handleContinue = () => {
  };

  const handleSignIn = () => {
    navigation.navigate('login');
  };


  const openAuthenticationStatement = () => {
    Linking.openURL('YOUR_WEBSITE_URL/authentication-statement');
  };

  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: '#ffffff',
    }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header with back arrow */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: 24,
        paddingBottom: 32,
      }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('role-selection')}
        >
          <MaterialIcons name="arrow-back" size={28} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={{
          fontSize: 32,
          fontWeight: 'bold',
          color: '#000000',
          marginBottom: 20,
        }}>Let's get started</Text>

        {/* Subtitle */}
        <Text style={{
          fontSize: 14,
          lineHeight: 24,
          color: '#9ca3af',
          marginBottom: 30,
        }}>
          You are signing up as a <Text style={{ fontWeight: 'bold', color: '#9ca3af' }}>Lawyer</Text>. To protect users
          and maintain the integrity of our platform, all
          lawyers are required to complete identity and
          license verification.
        </Text>

        {/* Steps from data */}
        {lawyerStartingSteps.map((step, idx) => {
          let IconComponent = null;
          if (step.iconLib === 'FontAwesome5') IconComponent = FontAwesome5;
          else if (step.iconLib === 'Feather') IconComponent = Feather;
          else if (step.iconLib === 'MaterialCommunityIcons') IconComponent = MaterialCommunityIcons;

          return (
            <View key={idx} style={{ marginBottom: idx === lawyerStartingSteps.length - 1 ? 40 : 32 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: 8,
                alignItems: 'center'
              }}>{step.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 }}>
                <View style={{
                  width: 48,
                  height: 48,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                }}>
                  {IconComponent && (
                    <IconComponent name={step.icon} size={28} color="#1e3a8a" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 12,
                    color: '#6b7280',
                    lineHeight: 22,
                  }}>{step.description}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Terms Text */}
        <Text style={{
          fontSize: 12,
          lineHeight: 20,
          color: '#9ca3af',
        }}>
          Clicking the continue button means that I have read and
          agreed to the 
          <TouchableOpacity onPress={openAuthenticationStatement}>
            <Text style={{
              color: '#000000',
              textDecorationLine: 'underline',
            }}> user identity authentication information statement</Text>
          </TouchableOpacity>.
          </Text>
      </ScrollView>

      {/* Continue Button */}
      <View style={{
        paddingHorizontal: 24,
        paddingBottom: 32,
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#1d4ed8',
            borderRadius: 12,
            paddingVertical: 20,
            alignItems: 'center',
            marginBottom: 20,
          }}
          onPress={handleContinue}
        >
          <Text style={{
            color: '#ffffff',
            fontSize: 18,
            fontWeight: '600',
          }}>Continue</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <TouchableOpacity onPress={handleSignIn} style={{ alignItems: 'center' }}>
          <Text style={{
            fontSize: 14,
            color: '#6b7280',
          }}>
            Already have an account? <Text style={{
              color: '#1d4ed8',
              fontWeight: '500',
            }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
