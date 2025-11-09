import React from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "tailwind-react-native-classnames";
import { useRouter } from "expo-router";
import Header from "@/components/Header";
import { VStack } from "@/components/ui/vstack";
import { Text as GSText } from "@/components/ui/text";
import Navbar from "@/components/Navbar";
import Colors from "@/constants/Colors";

const BulletPoint = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
    <GSText size="md" style={{ color: Colors.text.sub, marginTop: 2 }}>•</GSText>
    <GSText size="md" style={{ color: Colors.text.body, flex: 1 }}>
      {children}
    </GSText>
  </View>
);

const InfoBox = ({ children }: { children: React.ReactNode }) => (
  <View style={{ 
    backgroundColor: '#F9FAFB', 
    padding: 14, 
    borderRadius: 6, 
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8 
  }}>
    {children}
  </View>
);

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={tw`flex-1 bg-white`}>
        <Header showBackButton={true} showMenu={false} onBackPress={() => router.back()} />

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <GSText size="2xl" bold style={{ color: Colors.text.head, marginBottom: 24 }}>
            About Ai.ttorney
          </GSText>

          {/* Content */}
          <VStack style={{ gap: 20 }}>
            {/* Introduction */}
            <VStack style={{ gap: 12 }}>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney is a mobile-first, AI-powered legal literacy platform created to make legal information accessible, understandable, and inclusive for every Filipino. Millions of people face legal challenges but cannot easily access professional help due to cost, distance, or lack of awareness. Ai.ttorney bridges this gap by combining technology, verified legal expertise, and community engagement.
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Our mission is to empower users with knowledge of their rights and responsibilities and connect them to pro bono legal assistance, promoting fairness, awareness, and civic participation. By providing simplified, bilingual legal information and verified resources, Ai.ttorney supports informed decision-making for everyday legal matters.
              </GSText>
            </VStack>

            {/* Key Features */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                Key Features
              </GSText>

              {/* 1. Legal Literacy Resources */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  1. Legal Literacy Resources
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Access simplified, bilingual articles, how-to guides, and glossaries that explain complex legal terms and procedures in ways everyone can understand.</BulletPoint>
                  <BulletPoint>Content is verified by licensed lawyers and bilingual translators for accuracy and clarity.</BulletPoint>
                  <BulletPoint>Covers core areas of law relevant to daily life.</BulletPoint>
                </VStack>
              </VStack>

              {/* 2. Community Forum */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  2. Community Forum
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>A safe, moderated space where users can ask general legal questions, share experiences, and learn from licensed lawyers and fellow citizens.</BulletPoint>
                  <BulletPoint>Lawyers provide only general information, and promotion of law firms or solicitation is prohibited.</BulletPoint>
                  <BulletPoint>AI-assisted moderation ensures respectful, accurate, and safe interactions.</BulletPoint>
                </VStack>
              </VStack>

              {/* 3. Consultation Requests */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  3. Consultation Requests
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Users can request pro bono consultations with verified lawyers through the app.</BulletPoint>
                  <BulletPoint>All consultations are free of charge.</BulletPoint>
                  <BulletPoint>Lawyers are responsible for contacting users directly to discuss details such as schedule and format.</BulletPoint>
                  <BulletPoint>Ai.ttorney does not facilitate direct messaging or in-app communication—it serves only as a booking and coordination platform.</BulletPoint>
                </VStack>
              </VStack>

              {/* 4. AI-Powered Smart Legal Chatbot */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  4. AI-Powered Smart Legal Chatbot
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Responds to user questions in plain language in English or Filipino.</BulletPoint>
                  <BulletPoint>Provides educational guidance, citations from relevant Philippine laws, and suggestions for next steps.</BulletPoint>
                  <BulletPoint>Includes disclaimers clarifying that responses are for educational purposes only and not formal legal advice.</BulletPoint>
                </VStack>
              </VStack>

              {/* 5. Legal Aid Directory */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  5. Legal Aid Directory
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>A centralized directory of verified lawyers, searchable by location, specialization, and consultation preferences.</BulletPoint>
                  <BulletPoint>Offers a list view for individual lawyers and a map view for law firms using the Google Places API.</BulletPoint>
                  <BulletPoint>Helps users find legal professionals while maintaining privacy, neutrality, and accessibility.</BulletPoint>
                </VStack>
              </VStack>

              {/* 6. Personalized Dashboards */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  6. Personalized Dashboards
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Registered users can save chatbot conversations, bookmark articles, favorite glossary terms, and track their learning progress.</BulletPoint>
                </VStack>
              </VStack>

              {/* 7. Onboarding Tutorials */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  7. Onboarding Tutorials
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Step-by-step walkthroughs guide new users on how to ask questions, explore glossary terms, and access articles, ensuring accessibility even for users with limited digital familiarity.</BulletPoint>
                </VStack>
              </VStack>

              {/* 8. Role-Based Access and Verification */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  8. Role-Based Access and Verification
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Lawyers are verified through the Supreme Court Roll of Attorneys and IBP credentials.</BulletPoint>
                  <BulletPoint>Admins maintain quality control, moderate content, and ensure compliance with ethical and privacy standards.</BulletPoint>
                  <BulletPoint>Users benefit from a trusted ecosystem with verified content and professionals.</BulletPoint>
                </VStack>
              </VStack>
            </VStack>

            {/* Legal Coverage */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                Legal Coverage
              </GSText>
              <GSText size="md" style={{ color: Colors.text.body }}>
                Ai.ttorney's AI chatbot and resources initially cover five primary areas of Philippine law, selected for their relevance to everyday life and high public demand:
              </GSText>

              {/* 1. Family Law */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  1. Family Law – Family Code of the Philippines (Executive Order No. 209)
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Marriage (Articles 1–5) – legal age, consent, and requisites.</BulletPoint>
                  <BulletPoint>Annulment (Articles 45–46) – grounds and limitations.</BulletPoint>
                  <BulletPoint>Child Custody (Article 213) – best interest of the child principle.</BulletPoint>
                  <BulletPoint>Violence Against Women and Children (RA 9262) – penalties for abuse.</BulletPoint>
                </VStack>
              </VStack>

              {/* 2. Civil Law */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  2. Civil Law – Civil Code of the Philippines (RA 386)
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Contracts (Articles 1305–1422) – requisites, defects, and validity.</BulletPoint>
                  <BulletPoint>Property Ownership – rights of possession and co-ownership.</BulletPoint>
                  <BulletPoint>Succession (Articles 774–1105) – inheritance rules and intestate succession.</BulletPoint>
                </VStack>
              </VStack>

              {/* 3. Criminal Law */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  3. Criminal Law – Revised Penal Code (Act No. 3815)
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Theft and Robbery (Articles 308–312) – penalties and distinctions.</BulletPoint>
                  <BulletPoint>Estafa (Article 315) – fraudulent acts punishable by law.</BulletPoint>
                  <BulletPoint>Self-Defense (Article 11) – justifying circumstances excluding liability.</BulletPoint>
                </VStack>
              </VStack>

              {/* 4. Labor Law */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  4. Labor Law – Labor Code of the Philippines
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Employee Benefits – minimum wage, overtime pay, 13th month pay.</BulletPoint>
                  <BulletPoint>Termination of Employment (Articles 297–298) – just and authorized causes.</BulletPoint>
                  <BulletPoint>Filing Complaints – NLRC Rules of Procedure, DOLE Department Order No. 147-15.</BulletPoint>
                </VStack>
              </VStack>

              {/* 5. Consumer Law */}
              <VStack style={{ gap: 8 }}>
                <GSText size="md" bold style={{ color: Colors.text.head }}>
                  5. Consumer Law – Consumer Act of the Philippines (RA 7394)
                </GSText>
                <VStack style={{ paddingLeft: 12 }}>
                  <BulletPoint>Consumer Rights – safety, information, and redress.</BulletPoint>
                  <BulletPoint>Unfair Sales Practices – prohibiting deceptive, misleading, or unfair acts.</BulletPoint>
                </VStack>
              </VStack>

              {/* Initial Scope and Future Expansion */}
              <InfoBox>
                <GSText size="md" bold style={{ color: Colors.text.head, marginBottom: 8 }}>
                  Initial Scope and Future Expansion
                </GSText>
                <GSText size="sm" style={{ color: Colors.text.body }}>
                  At launch, Ai.ttorney covers only the five domains above to ensure accuracy, simplicity, and a strong foundation. Over time, the platform aims to expand coverage to additional laws and topics to improve chatbot outputs and provide more comprehensive legal guidance.
                </GSText>
              </InfoBox>
            </VStack>

            {/* Principles and Ethics */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                Principles and Ethics
              </GSText>
              <VStack style={{ paddingLeft: 12 }}>
                <BulletPoint><GSText bold>Accessibility:</GSText> Legal knowledge should be available to all, regardless of background or financial capacity.</BulletPoint>
                <BulletPoint><GSText bold>Integrity:</GSText> Users and lawyers must engage respectfully, professionally, and ethically.</BulletPoint>
                <BulletPoint><GSText bold>Privacy:</GSText> User data is protected under the Data Privacy Act of 2012 (RA 10173).</BulletPoint>
                <BulletPoint><GSText bold>Non-Solicitation:</GSText> Lawyers are prohibited from advertising, promoting, or charging for services within the platform.</BulletPoint>
              </VStack>
            </VStack>

            {/* Important Notice */}
            <VStack style={{ gap: 12 }}>
              <GSText size="lg" bold style={{ color: Colors.text.head }}>
                Important Notice
              </GSText>
              <InfoBox>
                <GSText size="md" style={{ color: Colors.text.body }}>
                  Ai.ttorney is not a law firm and does not provide legal representation or case-specific legal advice. Any information provided—including AI responses or forum posts—is for general educational purposes only. Users are encouraged to consult a licensed lawyer directly for matters requiring formal legal counsel. Ai.ttorney shall not be held liable for any actions, omissions, or outcomes arising from reliance on information obtained through the app.
                </GSText>
              </InfoBox>
            </VStack>

            {/* Last Updated */}
            <VStack style={{ gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              <GSText size="xs" style={{ color: Colors.text.sub, textAlign: 'center' }}>
                © 2025 Ai.ttorney. All rights reserved.
              </GSText>
            </VStack>
          </VStack>
        </ScrollView>
        
        <Navbar />
      </View>
    </SafeAreaView>
  );
}
