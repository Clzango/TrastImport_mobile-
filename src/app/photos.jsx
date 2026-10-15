import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui";

export default function PhotoViewerScreen() {
  const params = useLocalSearchParams();
  const urls = JSON.parse(params.urls ?? "[]");
  const start = Number(params.index ?? 0);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(start);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: start * width, y: 0 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {urls.map((uri) => (
          <ScrollView key={uri} style={{ width, height }} maximumZoomScale={4} minimumZoomScale={1} centerContent showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
            <Image source={{ uri }} contentFit="contain" transition={150} style={{ width, height }} />
          </ScrollView>
        ))}
      </ScrollView>

      <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Close"
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name={{ sf: "xmark", md: "close" }} size={16} color="#fff" weight="semibold" />
        </Pressable>
        {urls.length > 1 && (
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
            {page + 1} of {urls.length}
          </Text>
        )}
        <View style={{ width: 36 }} />
      </View>
    </View>
  );
}
