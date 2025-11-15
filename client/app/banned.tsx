import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Info, Trash2 } from 'lucide-react-native';

const BannedPage: React.FC = () => {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Simple Header with Logo Only */}
      <View style={styles.header}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Your account was permanently banned</Text>
          <Text style={styles.subtitle}>
            This action is permanent and cannot be appealed.
          </Text>
        </View>

        {/* What does this mean? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What does this mean?</Text>
          
          <View style={styles.item}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={20} color="#023D7B" />
            </View>
            <Text style={styles.itemText}>
              Your account has been permanently removed for severe or repeated violations of our Community Guidelines.
            </Text>
          </View>

          <View style={styles.item}>
            <View style={styles.iconContainer}>
              <Info size={20} color="#023D7B" />
            </View>
            <Text style={styles.itemText}>
              You will no longer have access to any features of Ai.ttorney, including chatbot, forum, and legal consultations.
            </Text>
          </View>

          <View style={styles.item}>
            <View style={styles.iconContainer}>
              <Trash2 size={20} color="#023D7B" />
            </View>
            <Text style={styles.itemText}>
              Your content is no longer visible to other users in the app.
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutButtonText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 35,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF', // blue-50 equivalent
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#023D7B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BannedPage;
