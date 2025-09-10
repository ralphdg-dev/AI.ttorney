import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Video, Phone, Clock, Star } from 'lucide-react-native';
import LawyerNavbar from '../../components/lawyer/LawyerNavbar';
import Header from '../../components/Header';
import Colors from '../../constants/Colors';
import { LawyerRoute } from '../../components/auth/ProtectedRoute';

interface ConsultationRequest {
  id: string;
  client: {
    name: string;
    avatar: string;
    rating?: number;
  };
  category: string;
  type: 'chat' | 'video' | 'phone';
  status: 'pending' | 'scheduled' | 'completed';
  requestTime: string;
  scheduledTime?: string;
  urgency: 'low' | 'medium' | 'high';
  description: string;
  estimatedDuration: string;
}

const LawyerConsultPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'completed'>('all');

  const sampleRequests: ConsultationRequest[] = [
    {
      id: 'consult_001',
      client: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        rating: 4.8,
      },
      category: 'Family Law',
      type: 'video',
      status: 'pending',
      urgency: 'high',
      requestTime: '2 hours ago',
      description: 'Need urgent consultation regarding child custody modification due to changed circumstances.',
      estimatedDuration: '45 minutes',
    },
    {
      id: 'consult_002',
      client: {
        name: 'Michael Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      },
      category: 'Business Law',
      type: 'chat',
      status: 'scheduled',
      urgency: 'medium',
      requestTime: '4 hours ago',
      scheduledTime: 'Today 3:00 PM',
      description: 'Contract review for new partnership agreement and liability concerns.',
      estimatedDuration: '30 minutes',
    },
    {
      id: 'consult_003',
      client: {
        name: 'Lisa Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        rating: 4.9,
      },
      category: 'Criminal Law',
      type: 'phone',
      status: 'completed',
      urgency: 'high',
      requestTime: '1 day ago',
      description: 'Emergency consultation completed regarding arrest warrant and bail procedures.',
      estimatedDuration: '60 minutes',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'phone':
        return Phone;
      default:
        return MessageCircle;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
      case 'medium':
        return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' };
      default:
        return { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'scheduled':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46' };
      default:
        return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const filteredRequests = filter === 'all' ? sampleRequests : sampleRequests.filter(req => req.status === filter);

  const handleRequestPress = (requestId: string) => {
    console.log(`Consultation request ${requestId} pressed`);
    // TODO: Navigate to consultation details
  };

  const handleAcceptRequest = (requestId: string) => {
    console.log(`Accept consultation ${requestId}`);
    // TODO: Accept consultation request
  };

  return (
    <LawyerRoute>
      <SafeAreaView style={styles.container}>
      <Header 
        variant="lawyer-consult"
        title="Consultations"
        showSearch={true}
        onSearchPress={() => console.log('Search consultations')}
      />
      
      <View style={styles.content}>
        {/* Stats Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>₱45,000</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </ScrollView>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'pending', 'scheduled', 'completed'].map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterTab,
                filter === filterOption && styles.activeFilterTab
              ]}
              onPress={() => setFilter(filterOption as any)}
            >
              <Text style={[
                styles.filterText,
                filter === filterOption && styles.activeFilterText
              ]}>
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Consultation Requests */}
        <ScrollView style={styles.requestsList} showsVerticalScrollIndicator={false}>
          {filteredRequests.map((request) => {
            const TypeIcon = getTypeIcon(request.type);
            const urgencyStyle = getUrgencyColor(request.urgency);
            const statusStyle = getStatusColor(request.status);
            
            return (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => handleRequestPress(request.id)}
                activeOpacity={0.7}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.clientInfo}>
                    <Image source={{ uri: request.client.avatar }} style={styles.clientAvatar} />
                    <View style={styles.clientDetails}>
                      <View style={styles.clientNameRow}>
                        <Text style={styles.clientName}>{request.client.name}</Text>
                        {request.client.rating && (
                          <View style={styles.ratingContainer}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.rating}>{request.client.rating}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.category}>{request.category}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.requestMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {request.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.preview} numberOfLines={2}>{request.description}</Text>

                <View style={styles.requestFooter}>
                  <View style={styles.requestInfo}>
                    <View style={styles.typeContainer}>
                      <TypeIcon size={14} color="#6B7280" />
                      <Text style={styles.typeText}>{request.type.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.urgencyBadge, {
                      backgroundColor: urgencyStyle.bg,
                      borderColor: urgencyStyle.border,
                    }]}>
                      <Text style={[styles.urgencyText, { color: urgencyStyle.text }]}>
                        {request.urgency.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.timeAndFee}>
                    <View style={styles.timeInfo}>
                      <Clock size={12} color="#6B7280" />
                      <Text style={styles.timeText}>
                        {request.scheduledTime || request.requestTime}
                      </Text>
                    </View>
                    <Text style={styles.fee}>{request.estimatedDuration}</Text>
                  </View>
                </View>

                {request.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(request.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.acceptButtonText}>Accept Consultation</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      <LawyerNavbar activeTab="consult" />
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
    paddingTop: 16,
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary.blue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterTab: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  requestsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  clientDetails: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
    marginLeft: 2,
  },
  category: {
    fontSize: 13,
    color: '#6B7280',
  },
  requestMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeAndFee: {
    alignItems: 'flex-end',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  fee: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.blue,
  },
  acceptButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 80,
  },
});

export default LawyerConsultPage;
