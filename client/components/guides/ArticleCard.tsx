import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
  FlatList,
  useWindowDimensions,
} from "react-native";
import tw from "tailwind-react-native-classnames";
import Colors from "@/constants/Colors";
import { Badge, BadgeText } from "@/components/ui/badge";
import { ChevronRight, Bookmark } from "lucide-react-native";

export interface ArticleItem {
  id: string;
  title: string;
  summary: string;
  imageUrl?: string;
  image?: ImageSourcePropType;
  category?: string;
  isBookmarked?: boolean;
  filipinoTitle?: string;
  filipinoSummary?: string;
}

interface ArticleCardProps {
  item: ArticleItem;
  onPress?: (item: ArticleItem) => void;
  containerStyle?: StyleProp<ViewStyle>;
  onToggleBookmark?: (item: ArticleItem) => void;
  showBookmark?: boolean; // Control bookmark visibility
}

function getCategoryBadgeClasses(
  category?: string
): { container: string; text: string } {
  switch ((category || "").toLowerCase()) {
    case "family":
      return { container: "bg-rose-50 border-rose-200", text: "text-rose-700" };
    case "work":
      return { container: "bg-blue-50 border-blue-200", text: "text-blue-700" };
    case "civil":
      return {
        container: "bg-violet-50 border-violet-200",
        text: "text-violet-700",
      };
    case "criminal":
      return { container: "bg-red-50 border-red-200", text: "text-red-700" };
    case "consumer":
      return {
        container: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
      };
    default:
      return { container: "bg-gray-50 border-gray-200", text: "text-gray-700" };
  }
}

export const ArticleCard = ({
  item,
  onPress,
  containerStyle,
  onToggleBookmark,
  showBookmark = true, // Default to true for backward compatibility
}: ArticleCardProps) => {
  const noImageUri =
    "https://placehold.co/1200x800/png?text=No+Image+Available";
  const initialSource: ImageSourcePropType = useMemo(
    () => item.image ?? { uri: item.imageUrl || noImageUri },
    [item.image, item.imageUrl]
  );
  const [imageSource, setImageSource] =
    useState<ImageSourcePropType>(initialSource);

  return (
    <View style={[tw`mb-4 flex-1 px-2`, containerStyle]}>
      <View
        style={[
          tw`bg-white border border-gray-200`,
          {
            borderRadius: 16,
            overflow: "hidden",
            position: "relative",
            height: 400, // fixed height for consistent cards
            flexDirection: "column",
          },
        ]}
      >
        {/* Image */}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onPress && onPress(item)}
        >
          <View style={{ height: 160, width: "100%" }}>
            <Image
              source={imageSource}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              onError={() => setImageSource({ uri: noImageUri })}
              accessibilityLabel={`Cover image for ${item.title}`}
            />
          </View>
        </TouchableOpacity>

        {/* Bookmark - Only show if not in guest mode */}
        {showBookmark && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => onToggleBookmark && onToggleBookmark(item)}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              padding: 6,
              borderRadius: 9999,
              backgroundColor: "rgba(255,255,255,0.9)",
              zIndex: 10,
            }}
          >
            <Bookmark
              size={18}
              color={item.isBookmarked ? "#f59e0b" : "#9ca3af"}
              strokeWidth={2}
              fill={item.isBookmarked ? "#f59e0b" : "none"}
            />
          </TouchableOpacity>
        )}

        {/* Content */}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onPress && onPress(item)}
          style={{ flex: 1 }}
        >
          <View style={[tw`p-4 flex-1`]}>
            <View style={tw`flex-row items-start justify-between mb-3`}>
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                style={[
                  tw`font-bold text-base`,
                  { color: Colors.text.head, flex: 1, marginRight: 8 },
                ]}
              >
                {item.title}
              </Text>
              {item.category ? (
                <Badge
                  variant="outline"
                  className={`rounded-md ${
                    getCategoryBadgeClasses(item.category).container
                  }`}
                >
                  <BadgeText
                    size="sm"
                    className={getCategoryBadgeClasses(item.category).text}
                  >
                    {item.category}
                  </BadgeText>
                </Badge>
              ) : null}
            </View>

            {item.filipinoTitle ? (
              <Text
                style={[
                  tw`text-sm mb-3 font-medium`,
                  { color: Colors.primary.blue },
                ]}
              >
                {item.filipinoTitle}
              </Text>
            ) : null}

            <Text
              numberOfLines={3}
              ellipsizeMode="tail"
              style={[tw`text-sm leading-5 mb-3`, { color: Colors.text.sub }]}
            >
              {item.summary}
            </Text>

            {item.filipinoSummary ? (
              <Text
                numberOfLines={3}
                ellipsizeMode="tail"
                style={[tw`text-sm leading-5`, { color: Colors.text.sub }]}
              >
                {item.filipinoSummary}
              </Text>
            ) : (
              <View style={tw`h-6`} />
            )}
          </View>
          <View style={{ position: "absolute", right: 12, bottom: 12 }}>
            <ChevronRight size={20} color={Colors.primary.blue} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* -------------------------
   Wrapper with Categories + Grid
-------------------------- */
export const ArticleList = ({
  data,
  categories,
  onPressCard,
  onToggleBookmark,
}: {
  data: ArticleItem[];
  categories: string[];
  onPressCard: (item: ArticleItem) => void;
  onToggleBookmark: (item: ArticleItem) => void;
}) => {
  const { width } = useWindowDimensions();

  // Responsive grid
  const numColumns = useMemo(() => {
    if (width > 1000) return 3;
    if (width > 600) return 2;
    return 1;
  }, [width]);

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Categories */}
      <View style={tw`flex-row flex-wrap justify-center items-center mb-4 px-4`}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={tw`px-4 py-2 m-1 rounded-full bg-gray-100`}
          >
            <Text style={tw`text-gray-700 font-medium`}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Articles grid */}
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <ArticleCard
            item={item}
            onPress={onPressCard}
            onToggleBookmark={onToggleBookmark}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns} // fixes refresh/remount bug
        contentContainerStyle={tw`px-2 pb-20`}
      />
    </View>
  );
};
