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

// Constants
const NO_IMAGE_URI = "https://placehold.co/1200x800/png?text=No+Image+Available";
const IMAGE_HEIGHT = 160;
const BOOKMARK_SIZE = 18;
const CHEVRON_SIZE = 20;

// Styles
const cardStyles = {
  container: tw`mb-4 flex-1`,
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: "hidden" as const,
    position: "relative" as const,
    flexDirection: "column" as const,
  },
  imageContainer: { height: IMAGE_HEIGHT, width: "100%" as const },
  image: { width: "100%" as const, height: "100%" as const },
  bookmarkButton: {
    position: "absolute" as const,
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.9)",
    zIndex: 10,
  },
  content: { padding: 16, paddingBottom: 48 },
  header: { flexDirection: "row" as const, alignItems: "flex-start" as const, justifyContent: "space-between" as const, marginBottom: 12 },
  title: { fontWeight: "700" as const, fontSize: 16, flex: 1, marginRight: 8 },
  filipinoTitle: { fontSize: 14, marginBottom: 12, fontWeight: "500" as const },
  summary: { fontSize: 14 },
  chevronButton: { position: "absolute" as const, right: 12, bottom: 12 },
};

export const ArticleCard = ({
  item,
  onPress,
  containerStyle,
  onToggleBookmark,
  showBookmark = true,
}: ArticleCardProps) => {
  // Memoized image source
  const initialSource: ImageSourcePropType = useMemo(
    () => item.image ?? { uri: item.imageUrl || NO_IMAGE_URI },
    [item.image, item.imageUrl]
  );
  const [imageSource, setImageSource] = useState<ImageSourcePropType>(initialSource);

  // Memoized category badge classes
  const categoryBadge = useMemo(
    () => item.category ? getCategoryBadgeClasses(item.category) : null,
    [item.category]
  );

  // Memoized handlers
  const handlePress = useMemo(
    () => () => onPress?.(item),
    [onPress, item]
  );

  const handleBookmarkPress = useMemo(
    () => () => onToggleBookmark?.(item),
    [onToggleBookmark, item]
  );

  const handleImageError = useMemo(
    () => () => setImageSource({ uri: NO_IMAGE_URI }),
    []
  );

  return (
    <View style={[cardStyles.container, containerStyle]}>
      <View style={cardStyles.card}>
        {/* Image */}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handlePress}
        >
          <View style={cardStyles.imageContainer}>
            <Image
              source={imageSource}
              style={cardStyles.image}
              resizeMode="cover"
              onError={handleImageError}
              accessibilityLabel={`Cover image for ${item.title}`}
            />
          </View>
        </TouchableOpacity>

        {/* Bookmark */}
        {showBookmark && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleBookmarkPress}
            style={cardStyles.bookmarkButton}
          >
            <Bookmark
              size={BOOKMARK_SIZE}
              color={item.isBookmarked ? "#f59e0b" : "#9ca3af"}
              strokeWidth={2}
              fill={item.isBookmarked ? "#f59e0b" : "none"}
            />
          </TouchableOpacity>
        )}

        {/* Content */}
        <View style={cardStyles.content}>
          {/* Header: Title + Category Badge */}
          <View style={cardStyles.header}>
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[cardStyles.title, { color: Colors.text.head }]}
            >
              {item.title}
            </Text>
            {categoryBadge && (
              <Badge
                variant="outline"
                className={`rounded-md ${categoryBadge.container}`}
              >
                <BadgeText size="sm" className={categoryBadge.text}>
                  {item.category}
                </BadgeText>
              </Badge>
            )}
          </View>

          {/* Filipino Title */}
          {item.filipinoTitle && (
            <Text style={[cardStyles.filipinoTitle, { color: Colors.primary.blue }]}>
              {item.filipinoTitle}
            </Text>
          )}

          {/* Summary */}
          <Text
            numberOfLines={3}
            ellipsizeMode="tail"
            style={[
              cardStyles.summary,
              { 
                color: Colors.text.sub,
                marginBottom: item.filipinoSummary ? 12 : 0,
              },
            ]}
          >
            {item.summary}
          </Text>

          {/* Filipino Summary */}
          {item.filipinoSummary && (
            <Text
              numberOfLines={3}
              ellipsizeMode="tail"
              style={[cardStyles.summary, { color: Colors.text.sub }]}
            >
              {item.filipinoSummary}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handlePress}
          style={cardStyles.chevronButton}
        >
          <ChevronRight size={CHEVRON_SIZE} color={Colors.primary.blue} />
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
