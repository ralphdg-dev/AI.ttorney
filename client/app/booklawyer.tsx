import React from "react";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from "react-native";
import BookLawyer from "../components/booklawyer/LawyerBookingView";
import Colors from "../constants/Colors";

export default function BookLawyerScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary, paddingBottom: insets.bottom }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <BookLawyer />
    </SafeAreaView>
  );
}