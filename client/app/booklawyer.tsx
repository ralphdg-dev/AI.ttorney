import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import BookLawyer from "../components/booklawyer/LawyerBookingView";
import Colors from "../constants/Colors";

export default function BookLawyerPage() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
      <BookLawyer />
    </SafeAreaView>
  );
}