import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LegalDisclaimerProps {
  showFilipino?: boolean;
}

export default function LegalDisclaimer({ showFilipino = false }: LegalDisclaimerProps) {
  const disclaimerText = {
    en: {
      title: "Legal Notice",
      content: "This guide is general information only, not legal advice. For specific concerns, please consult a qualified lawyer.",
    },
    fil: {
      title: "Legal na Paalala",
      content: "Ang gabay na ito ay pangkalahatang impormasyon lamang at hindi legal advice. Para sa tukoy na usapin, kumonsulta sa kwalipikadong abogado.",
    }
  };

  const text = showFilipino ? disclaimerText.fil : disclaimerText.en;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={18} color="#F59E0B" />
        <Text style={styles.title}>{text.title}</Text>
      </View>
      
      <Text style={styles.content}>
        {text.content}
      </Text>
      
   
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 12,
    paddingTop: 8,
    marginTop: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
    marginLeft: 8,
  },
  content: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'justify',
  },
  reminderContainer: {
    backgroundColor: '#BFDBFE',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  reminder: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E3A8A',
    fontStyle: 'italic',
  },
});
