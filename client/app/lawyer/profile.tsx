import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Edit, Star, Users, Briefcase, LogOut, Shield, Mail, Phone, MapPin, Calendar, Award } from 'lucide-react-native';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import Header from '../../components/Header';
import Colors from '../../constants/Colors';
import { LawyerRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

const LawyerProfilePage: React.FC = () => {
  const { signOut } = useAuth();
  const [profileData] = React.useState({
    name: 'Atty. Maria Santos',
    email: 'maria.santos@lawfirm.com',
    phone: '+63 912 345 6789',
    location: 'Makati City, Philippines',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    specialization: 'Family & Criminal Law',
    experience: '8 years',
    rating: 4.8,
    totalReviews: 127,
    verificationStatus: 'Verified Lawyer',
    licenseNumber: 'PH-LAW-2016-001234',
    barAdmission: '2016',
  });

  const [stats] = React.useState({
    totalCases: 45,
    activeCases: 12,
    totalClients: 38,
    consultations: 156,
    successRate: 92,
  });

  const handleEditProfile = () => {
    console.log('Edit profile');
    // TODO: Navigate to edit profile screen
  };

  const handleSettings = () => {
    console.log('Settings');
    // TODO: Navigate to settings screen
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <LawyerRoute>
      <SafeAreaView style={styles.container}>
      <Header 
        variant="lawyer-profile"
        title="Profile"
        showSettings={true}
        onSettingsPress={handleSettings}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
            <View style={styles.verificationBadge}>
              <Shield size={16} color="#059669" fill="#059669" />
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profileData.name}</Text>
            <Text style={styles.specialization}>{profileData.specialization}</Text>
            <View style={styles.verificationContainer}>
              <Text style={styles.verificationText}>{profileData.verificationStatus}</Text>
            </View>
            
            <View style={styles.ratingContainer}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.rating}>{profileData.rating}</Text>
              <Text style={styles.reviewCount}>({profileData.totalReviews} reviews)</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Edit size={18} color={Colors.primary.blue} />
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactItem}>
            <Mail size={18} color="#6B7280" />
            <Text style={styles.contactText}>{profileData.email}</Text>
          </View>
          <View style={styles.contactItem}>
            <Phone size={18} color="#6B7280" />
            <Text style={styles.contactText}>{profileData.phone}</Text>
          </View>
          <View style={styles.contactItem}>
            <MapPin size={18} color="#6B7280" />
            <Text style={styles.contactText}>{profileData.location}</Text>
          </View>
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          <View style={styles.professionalGrid}>
            <View style={styles.professionalItem}>
              <Text style={styles.professionalLabel}>Experience</Text>
              <Text style={styles.professionalValue}>{profileData.experience}</Text>
            </View>
            <View style={styles.professionalItem}>
              <Text style={styles.professionalLabel}>Bar Admission</Text>
              <Text style={styles.professionalValue}>{profileData.barAdmission}</Text>
            </View>
            <View style={styles.professionalItem}>
              <Text style={styles.professionalLabel}>License Number</Text>
              <Text style={styles.professionalValue}>{profileData.licenseNumber}</Text>
            </View>
            <View style={styles.professionalItem}>
              <Text style={styles.professionalLabel}>Success Rate</Text>
              <Text style={styles.professionalValue}>{stats.successRate}%</Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Briefcase size={24} color={Colors.primary.blue} />
              <Text style={styles.statNumber}>{stats.totalCases}</Text>
              <Text style={styles.statLabel}>Total Cases</Text>
            </View>
            <View style={styles.statCard}>
              <Calendar size={24} color={Colors.primary.blue} />
              <Text style={styles.statNumber}>{stats.activeCases}</Text>
              <Text style={styles.statLabel}>Active Cases</Text>
            </View>
            <View style={styles.statCard}>
              <Users size={24} color={Colors.primary.blue} />
              <Text style={styles.statNumber}>{stats.totalClients}</Text>
              <Text style={styles.statLabel}>Total Clients</Text>
            </View>
            <View style={styles.statCard}>
              <Award size={24} color={Colors.primary.blue} />
              <Text style={styles.statNumber}>{stats.consultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionItem} onPress={handleEditProfile}>
            <Edit size={20} color="#374151" />
            <Text style={styles.actionText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={handleSettings}>
            <Settings size={20} color="#374151" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionItem, styles.logoutItem]} onPress={handleLogout}>
            <LogOut size={20} color="#DC2626" />
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <LawyerNavbar activeTab="profile" />
      </SafeAreaView>
    </LawyerRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  verificationContainer: {
    marginBottom: 8,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  professionalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  professionalItem: {
    width: '48%',
    marginBottom: 16,
  },
  professionalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  professionalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#DC2626',
  },
  bottomSpacer: {
    height: 80,
  },
});

export default LawyerProfilePage;
