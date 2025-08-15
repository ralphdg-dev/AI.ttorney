import React from "react";
import { View, useWindowDimensions } from "react-native";
import Colors from "@/constants/Colors";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Text as GSText } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Divider } from "@/components/ui/divider";
import { Accordion, AccordionContent, AccordionHeader, AccordionIcon, AccordionItem, AccordionTitleText, AccordionTrigger, AccordionContentText } from "@/components/ui/accordion";
import { Star, Languages, BookText, Quote } from "lucide-react-native";

export interface TermDetailData {
  id: string;
  englishTerm: string;
  filipinoTerm: string;
  englishDefinition: string;
  filipinoDefinition: string;
  exampleUsage?: {
    english?: string;
    filipino?: string;
  };
  isFavorite?: boolean;
  category?: string;
}

interface TermDetailProps {
  term: TermDetailData;
}

export default function TermDetail({ term }: TermDetailProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 800;

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 }}>
        <HStack className="items-center justify-between">
          <VStack className="flex-1 mr-4">
            <Heading size="xl" bold style={{ color: Colors.text.head }}>
              {term.englishTerm}
            </Heading>
            <GSText size="sm" sub style={{ color: Colors.text.sub, marginTop: 4 }}>
              {term.filipinoTerm}
            </GSText>
            {term.category ? (
              <GSText size="xs" style={{ color: Colors.primary.blue, marginTop: 8 }}>
                {term.category}
              </GSText>
            ) : null}
          </VStack>
          <Star
            size={22}
            color={term.isFavorite ? "#f59e0b" : "#9CA3AF"}
            strokeWidth={2}
            fill={term.isFavorite ? "#f59e0b" : "none"}
          />
        </HStack>
      </View>

      <Divider />

      <View style={{ padding: 24 }}>
        {isWide ? (
          <HStack className="w-full" style={{ gap: 16 }}>
            <Card className="flex-1 p-4 bg-white">
              <HStack className="items-center mb-2">
                <BookText size={18} color={Colors.text.head} />
                <GSText size="md" bold style={{ marginLeft: 8, color: Colors.text.head }}>
                  English Definition
                </GSText>
              </HStack>
              <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                {term.englishDefinition}
              </GSText>
            </Card>

            <Card className="flex-1 p-4 bg-white">
              <HStack className="items-center mb-2">
                <Languages size={18} color={Colors.text.head} />
                <GSText size="md" bold style={{ marginLeft: 8, color: Colors.text.head }}>
                  Filipino Definition
                </GSText>
              </HStack>
              <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                {term.filipinoDefinition}
              </GSText>
            </Card>
          </HStack>
        ) : (
          <Card className="bg-white">
            <Accordion className="rounded-xl overflow-hidden">
              <AccordionItem value="english">
                <AccordionHeader>
                  <AccordionTrigger>
                    <HStack className="items-center flex-1">
                      <BookText size={18} color={Colors.text.head} />
                      <AccordionTitleText className="ml-2">English Definition</AccordionTitleText>
                    </HStack>
                    <AccordionIcon size="md" />
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <AccordionContentText>
                    <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                      {term.englishDefinition}
                    </GSText>
                  </AccordionContentText>
                </AccordionContent>
              </AccordionItem>

              <Divider />

              <AccordionItem value="filipino">
                <AccordionHeader>
                  <AccordionTrigger>
                    <HStack className="items-center flex-1">
                      <Languages size={18} color={Colors.text.head} />
                      <AccordionTitleText className="ml-2">Filipino Definition</AccordionTitleText>
                    </HStack>
                    <AccordionIcon size="md" />
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <AccordionContentText>
                    <GSText size="md" style={{ color: Colors.text.sub, lineHeight: 22 }}>
                      {term.filipinoDefinition}
                    </GSText>
                  </AccordionContentText>
                </AccordionContent>
              </AccordionItem>

              {term.exampleUsage?.english || term.exampleUsage?.filipino ? (
                <>
                  <Divider />
                  <AccordionItem value="example">
                    <AccordionHeader>
                      <AccordionTrigger>
                        <HStack className="items-center flex-1">
                          <Quote size={18} color={Colors.text.head} />
                          <AccordionTitleText className="ml-2">Example Usage</AccordionTitleText>
                        </HStack>
                        <AccordionIcon size="md" />
                      </AccordionTrigger>
                    </AccordionHeader>
                    <AccordionContent>
                      <VStack>
                        {term.exampleUsage?.english ? (
                          <GSText size="sm" style={{ color: Colors.text.sub, marginBottom: 8 }}>
                            “{term.exampleUsage.english}”
                          </GSText>
                        ) : null}
                        {term.exampleUsage?.filipino ? (
                          <GSText size="sm" style={{ color: Colors.text.sub }}>
                            “{term.exampleUsage.filipino}”
                          </GSText>
                        ) : null}
                      </VStack>
                    </AccordionContent>
                  </AccordionItem>
                </>
              ) : null}
            </Accordion>
          </Card>
        )}
      </View>
    </View>
  );
}


