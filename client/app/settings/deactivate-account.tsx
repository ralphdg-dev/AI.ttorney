import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { UserX, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { Toast, ToastTitle, ToastDescription, useToast } from '../../components/ui/toast';
import { NetworkConfig } from '../../utils/networkConfig';
import Colors from '../../constants/Colors';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { safeGoBack } from '../../utils/navigationHelper';

const DeactivateAccountScreen: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { session, refreshUserData, user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const executeDeactivation = async () => {
    try {
      setIsDeactivating(true);
      if (!session?.access_token) throw new Error('No active session');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const response = await fetch(`${apiUrl}/auth/deactivate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="success" variant="solid">
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Account deactivated successfully</ToastDescription>
            </Toast>
          )
        });
        await refreshUserData();
        setTimeout(() => router.replace('/deactivated'), 1500);
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>{data.detail || "Failed to deactivate account"}</ToastDescription>
            </Toast>
          )
        });
      }
    } catch (error) {
      console.error('❌ Deactivation error:', error);
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>An unexpected error occurred. Please try again.</ToastDescription>
          </Toast>
        )
      });
    } finally {
      setIsDeactivating(false);
      setShowModal(false);
    }
  };

  const validateEmailAndShowModal = async () => {
    if (!email.trim()) {
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast nativeID={id} action="error" variant="solid">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>Please enter your email</ToastDescription>
          </Toast>
        )
      });
      return;
    }

    try {
      setIsDeactivating(true);
      if (!session?.access_token) throw new Error('No active session');
      const apiUrl = await NetworkConfig.getBestApiUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${apiUrl}/auth/validate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (response.ok) {
        setIsDeactivating(false);
        setShowModal(true);
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>{data.detail || "Email does not match your account"}</ToastDescription>
            </Toast>
          )
        });
        setIsDeactivating(false);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>Request timed out. Please check your connection and try again.</ToastDescription>
            </Toast>
          )
        });
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast nativeID={id} action="error" variant="solid">
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>{error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}</ToastDescription>
            </Toast>
          )
        });
      }
      setIsDeactivating(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <StatusBar backgroundColor={Colors.background.primary} />
      
            
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.light,
      }}>
        <TouchableOpacity onPress={() => safeGoBack(router, {
          isGuestMode: false,
          isAuthenticated,
          userRole: user?.role,
          currentPath: pathname,
        })} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: Colors.text.primary,
          marginLeft: 16,
        }}>
          Deactivate Account
        </Text>
      </View>

      <View style={{ flex: 1, padding: 20 }}>
        {/* Warning Section */}
        <View style={{
          backgroundColor: '#F3F4F6',
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={20} color="#6B7280" style={{ marginRight: 12, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#6B7280',
              marginBottom: 8,
            }}>
              Before you deactivate
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
              lineHeight: 20,
            }}>
              • You will lose access to all features{'\n'}
              • Your posts and replies will remain visible with your name hidden{'\n'}
              • You can reactivate anytime by logging in{'\n'}
              • Your data will be preserved
            </Text>
          </View>
        </View>

        {/* User Info */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: Colors.border.light,
        }}>
          <Text style={{
            fontSize: 14,
            color: Colors.text.secondary,
            marginBottom: 8,
          }}>
            Deactivating account for:
          </Text>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: Colors.text.primary,
          }}>
            {user?.full_name || 'User'}
          </Text>
          <Text style={{
            fontSize: 14,
            color: Colors.text.secondary,
          }}>
            {user?.email}
          </Text>
        </View>

        {/* Email Input */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 32,
          borderWidth: 1,
          borderColor: Colors.border.light,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: Colors.text.primary,
            marginBottom: 12,
          }}>
            Confirm Email
          </Text>
          <Text style={{
            fontSize: 14,
            color: Colors.text.secondary,
            marginBottom: 16,
          }}>
            Enter your email to confirm account deactivation
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.border.light,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: Colors.text.primary,
              backgroundColor: Colors.background.primary,
            }}
            placeholder="Enter your email"
            placeholderTextColor={Colors.text.tertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        {/* Deactivate Button */}
        <TouchableOpacity
          onPress={validateEmailAndShowModal}
          disabled={isDeactivating || !email.trim()}
          style={{
            backgroundColor: '#023D7B',
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 24,
            alignItems: 'center',
            opacity: (isDeactivating || !email.trim()) ? 0.5 : 1,
          }}
        >
          {isDeactivating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <UserX size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#FFFFFF',
              }}>
                Deactivate Account
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Test Simple Modal */}
      {showModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9998,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            width: Math.min(320, window.innerWidth - 40),
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}>
            {/* Warning Icon */}
            <View style={{
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#FEE2E2',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <AlertTriangle size={28} color="#DC2626" />
              </View>
            </View>

            {/* Title */}
            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#111827',
              textAlign: 'center',
              marginBottom: 12,
            }}>
              Deactivate Account
            </Text>

            {/* Message */}
            <Text style={{
              fontSize: 16,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 24,
            }}>
              Are you sure you want to deactivate your account? This action can be reversed by logging in and reactivating your account.
            </Text>

            {/* Buttons */}
            <View style={{
              flexDirection: 'row',
              width: '100%',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => {
                  setShowModal(false);
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#374151',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#DC2626',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => {
                  executeDeactivation();
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}>
                  Deactivate
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={false} // Temporarily disabled
        onConfirm={() => {
          executeDeactivation();
        }}
        onCancel={() => {
          setShowModal(false);
        }}
        title="Deactivate Account"
        message="Are you sure you want to deactivate your account? This action can be reversed by logging in and reactivating your account."
        confirmText="Deactivate"
        cancelText="Cancel"
        loading={isDeactivating}
      />
    </SafeAreaView>
  );
};

export default DeactivateAccountScreen;
