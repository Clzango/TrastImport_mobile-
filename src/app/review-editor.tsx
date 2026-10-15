import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { Banner, Button, Field, HeaderButton, Icon, Loading, Screen, Section, StarPicker, haptic } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pickPhotos } from "@/lib/files";
import { formErrors } from "@/lib/form-errors";
import { invalidateCompany, keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";
import type { LocalFile, ReviewPhoto } from "@/lib/types";

const MAX_PHOTOS = 5;
const RATING_WORDS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (process.env.EXPO_OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

export default function ReviewEditorScreen() {
  const params = useLocalSearchParams<{ companyId: string; companyName?: string; reviewId?: string }>();
  const companyId = Number(params.companyId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [reviewId, setReviewId] = useState(params.reviewId ? Number(params.reviewId) : undefined);
  const existing = useQuery({ queryKey: keys.review(reviewId!), queryFn: () => api.reviews.get(reviewId!), enabled: !!reviewId && !!params.reviewId });

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [added, setAdded] = useState<LocalFile[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!existing.data) return;
    setRating(existing.data.rating);
    setComment(existing.data.comment);
    setPhotos(existing.data.photos);
  }, [existing.data]);

  const editing = !!params.reviewId;
  const photoCount = photos.length + added.length;
  const errors = formErrors(error, ["rating", "comment"]);

  const addPhotos = async () => {
    try {
      const picked = await pickPhotos(MAX_PHOTOS - photoCount);
      setAdded((a) => [...a, ...picked].slice(0, MAX_PHOTOS - photos.length));
    } catch (e) {
      setError(e);
    }
  };

  const offerExistingReview = async () => {
    const mine = user ? (await api.reviews.mine()).find((r) => r.company === companyId) : undefined;
    if (!mine) return;
    const open = () => router.replace({ pathname: "/review-editor", params: { companyId: String(companyId), companyName: params.companyName ?? "", reviewId: String(mine.id) } });
    if (process.env.EXPO_OS === "web") return open();
    Alert.alert("You've already reviewed this company", "Each buyer writes one review per company. You can edit the one you wrote.", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit My Review", onPress: open },
    ]);
  };

  const save = async () => {
    setError(null);
    let id = reviewId;
    try {
      // Step 1: create or update the review text.
      setSaving("Saving review…");
      if (id) {
        await api.reviews.update(id, { rating, comment: comment.trim() });
      } else {
        const created = await api.companies.createReview(companyId, rating, comment.trim());
        id = created.id;
        setReviewId(id);
      }

      // Step 2: photo changes, one request each (each counts against the 60 writes/hour limit).
      for (const photoId of removed) {
        await api.reviews.removePhoto(id, photoId);
      }
      setRemoved([]);
      setPhotos((p) => p.filter((x) => !removed.includes(x.id)));

      const queue = [...added];
      for (let i = 0; i < queue.length; i++) {
        setSaving(`Uploading photo ${i + 1} of ${queue.length}…`);
        const photo = await api.reviews.addPhoto(id, queue[i]!);
        setPhotos((p) => [...p, photo]);
        setAdded((a) => a.slice(1));
      }

      invalidateCompany(queryClient, companyId);
      queryClient.invalidateQueries({ queryKey: keys.review(id) });
      haptic("success");
      router.back();
    } catch (e) {
      if (id) invalidateCompany(queryClient, companyId);
      setError(id && !reviewId && e instanceof ApiError ? new ApiError(e.status, `Your review was saved, but a photo didn't upload: ${e.message}`) : e);
      if (e instanceof ApiError && /already reviewed/i.test(e.message)) offerExistingReview();
    } finally {
      setSaving(null);
    }
  };

  const remove = () =>
    confirm("Delete Review?", "Your rating, comment and photos will be removed.", "Delete", async () => {
      try {
        setSaving("Deleting…");
        await api.reviews.remove(reviewId!);
        invalidateCompany(queryClient, companyId);
        router.back();
      } catch (e) {
        setError(e);
      } finally {
        setSaving(null);
      }
    });

  if (editing && existing.isPending) return <Loading />;

  return (
    <>
      <Stack.Screen
        options={{
          title: editing ? "Edit Review" : "Write a Review",
          headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} />,
          headerRight: () =>
            saving ? <ActivityIndicator color={colors.accent as string} /> : <HeaderButton title={editing ? "Save" : "Post"} bold disabled={!rating} onPress={save} />,
        }}
      />
      <Screen>
        {params.companyName ? (
          <Text style={{ fontSize: 15, color: colors.secondaryLabel, textAlign: "center" }}>
            Reviewing <Text style={{ fontWeight: "600", color: colors.label }}>{params.companyName}</Text>
          </Text>
        ) : null}

        <Banner message={existing.isError ? errorMessage(existing.error) : errors.banner} />
        {saving && <Banner tone="info" message={saving} />}

        <View style={{ alignItems: "center", gap: 8 }}>
          <StarPicker value={rating} onChange={setRating} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: rating ? colors.accent : colors.secondaryLabel }}>
            {rating ? RATING_WORDS[rating] : "Tap to rate"}
          </Text>
          {errors.field.rating && <Text style={{ color: colors.danger, fontSize: 13 }}>{errors.field.rating}</Text>}
        </View>

        <Section>
          <Field
            label="Your experience"
            value={comment}
            onChangeText={setComment}
            multiline
            placeholder="Quality, communication, lead times, packaging, hidden fees…"
            error={errors.field.comment}
            style={{ minHeight: 140 }}
          />
        </Section>

        <Section header={`Photos (${photoCount}/${MAX_PHOTOS})`} footer="JPEG, PNG, WebP or GIF, up to 5 MB each. Photos are resized before upload and location data is removed.">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 12 }}>
            {photos.map((p) => (
              <Thumb key={p.id} uri={p.image} onRemove={() => (setRemoved((r) => [...r, p.id]), setPhotos((all) => all.filter((x) => x.id !== p.id)))} />
            ))}
            {added.map((f, i) => (
              <Thumb key={f.uri} uri={f.uri} pending onRemove={() => setAdded((a) => a.filter((_, j) => j !== i))} />
            ))}
            {photoCount < MAX_PHOTOS && (
              <Pressable
                onPress={addPhotos}
                accessibilityLabel="Add photos"
                style={({ pressed }) => ({
                  width: 76,
                  height: 76,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: colors.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name={{ sf: "camera.fill", md: "add_a_photo" }} size={22} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.accent }}>Add</Text>
              </Pressable>
            )}
          </View>
        </Section>

        {!editing && (
          <Text style={{ fontSize: 13, color: colors.secondaryLabel, textAlign: "center", lineHeight: 18, paddingHorizontal: 16 }}>
            You can write one review per company and edit it any time. Your name, country and verified badge are shown; your email and phone are not.
          </Text>
        )}

        {editing && <Button title="Delete Review" variant="destructive" onPress={remove} disabled={!!saving} />}
      </Screen>
    </>
  );
}

function Thumb({ uri, onRemove, pending }: { uri: string; onRemove: () => void; pending?: boolean }) {
  return (
    <View>
      <Image source={{ uri }} contentFit="cover" style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: colors.fill, opacity: pending ? 0.85 : 1 }} />
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityLabel="Remove photo"
        style={{ position: "absolute", top: -6, right: -6, backgroundColor: colors.cell, borderRadius: 12 }}
      >
        <Icon name={{ sf: "xmark.circle.fill", md: "cancel" }} size={22} color={colors.secondaryLabel} />
      </Pressable>
    </View>
  );
}
