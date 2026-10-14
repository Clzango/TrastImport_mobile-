import { Image } from "expo-image";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { formatDate } from "@/lib/format";
import { colors, radius } from "@/lib/theme";
import type { Review } from "@/lib/types";
import { Stars, VerifiedBadge } from "./ui";

export function openPhotos(review: Review, index: number) {
  router.push({ pathname: "/photos", params: { urls: JSON.stringify(review.photos.map((p) => p.image)), index: String(index) } });
}

/** One review: author and date, stars, text, photos and the company's reply. `footer` holds actions. */
function ReviewBody({ review, heading, footer }: { review: Review; heading?: ReactNode; footer?: ReactNode }) {
  return (
    <>
      {heading}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.label }}>{review.author_name || "Buyer"}</Text>
          {review.author_is_verified && <VerifiedBadge label="Verified buyer" />}
        </View>
        <Text style={{ fontSize: 13, color: colors.secondaryLabel }}>{formatDate(review.date_created)}</Text>
      </View>
      {review.author_country ? <Text style={{ fontSize: 13, color: colors.secondaryLabel, marginTop: -2 }}>{review.author_country}</Text> : null}

      <Stars rating={review.rating} size={14} />

      {review.comment ? (
        <Text selectable style={{ fontSize: 14, lineHeight: 21, color: colors.bodyText }}>
          {review.comment}
        </Text>
      ) : null}

      {review.photos.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {review.photos.map((photo, i) => (
            <Pressable key={photo.id} onPress={() => openPhotos(review, i)} accessibilityLabel={`Photo ${i + 1} of ${review.photos.length}`}>
              <Image source={{ uri: photo.image }} contentFit="cover" transition={150} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: colors.fill }} />
            </Pressable>
          ))}
        </View>
      )}

      {review.reply ? (
        <View style={{ backgroundColor: colors.groupedBackground, borderLeftWidth: 3, borderLeftColor: colors.accent, borderRadius: 8, padding: 12, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.label }}>Response from the company</Text>
          <Text selectable style={{ fontSize: 14, lineHeight: 20, color: colors.bodyText }}>
            {review.reply}
          </Text>
        </View>
      ) : null}

      {footer}
    </>
  );
}

/** A review as its own bordered card (My Reviews, Manage). */
export function ReviewCard(props: { review: Review; heading?: ReactNode; footer?: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.cell, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, borderCurve: "continuous", padding: 16, gap: 8 }}>
      <ReviewBody {...props} />
    </View>
  );
}

/** A review inside a Panel, separated from the next one by a hairline (Company Details). */
export function ReviewItem(props: { review: Review; footer?: ReactNode; divider?: boolean }) {
  return (
    <View style={{ gap: 6, paddingTop: props.divider ? 14 : 0, borderTopWidth: props.divider ? 1 : 0, borderTopColor: colors.separator }}>
      <ReviewBody {...props} />
    </View>
  );
}
