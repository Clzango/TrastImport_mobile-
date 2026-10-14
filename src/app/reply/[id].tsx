import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { ReviewCard } from "@/components/review-card";
import { Banner, Button, Field, HeaderButton, Loading, Screen, Section, haptic } from "@/components/ui";
import { api } from "@/lib/api";
import { formErrors } from "@/lib/form-errors";
import { invalidateCompany, keys } from "@/lib/query-keys";
import { colors } from "@/lib/theme";

export default function ReplyScreen() {
  const params = useLocalSearchParams<{ id: string; companyId: string }>();
  const id = Number(params.id);
  const companyId = Number(params.companyId);
  const queryClient = useQueryClient();
  const review = useQuery({ queryKey: keys.review(id), queryFn: () => api.reviews.get(id) });
  const [reply, setReply] = useState<string | null>(null);

  useEffect(() => {
    if (review.data && reply === null) setReply(review.data.reply ?? "");
  }, [review.data, reply]);

  const mutation = useMutation({
    mutationFn: (text: string) => api.reviews.reply(id, text),
    onSuccess: () => {
      haptic("success");
      invalidateCompany(queryClient, companyId);
      queryClient.invalidateQueries({ queryKey: keys.review(id) });
      router.back();
    },
  });
  const errors = formErrors(mutation.error, ["reply"]);

  if (!review.data || reply === null) return <Loading />;
  const hadReply = !!review.data.reply;

  return (
    <>
      <Stack.Screen
        options={{
          title: hadReply ? "Edit Reply" : "Reply",
          headerLeft: () => <HeaderButton title="Cancel" onPress={() => router.back()} />,
          headerRight: () =>
            mutation.isPending ? <ActivityIndicator color={colors.accent as string} /> : <HeaderButton title="Post" bold disabled={!reply.trim()} onPress={() => mutation.mutate(reply.trim())} />,
        }}
      />
      <Screen>
        <ReviewCard review={{ ...review.data, reply: "" }} />
        <Banner message={errors.banner} />
        <Section footer="Your reply shows under the review as a response from the company. Keep it factual and polite.">
          <Field label="Your reply" value={reply} onChangeText={setReply} multiline autoFocus error={errors.field.reply} />
        </Section>
        {hadReply && <Button title="Remove Reply" variant="destructive" onPress={() => mutation.mutate("")} disabled={mutation.isPending} />}
      </Screen>
    </>
  );
}
