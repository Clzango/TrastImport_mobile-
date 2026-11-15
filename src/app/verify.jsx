import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContainerPanel } from "@/components/container-panel";
import { Text, TextInput } from "@/components/text";
import { Banner, Button, haptic, Icon } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, radius } from "@/lib/theme";

const LENGTH = 6;
const RESEND_AFTER = 60;

/** Six boxes over one hidden input, so paste and one-time-code autofill work. */
function CodeInput({ value, onChange, onComplete, error, disabled }) {
  const input = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={{ alignSelf: "stretch" }}>
      <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
        {Array.from({ length: LENGTH }, (_, i) => {
          const char = value[i] ?? "";
          const active = focused && (i === value.length || (i === LENGTH - 1 && value.length === LENGTH));
          return (
            <View
              key={i}
              style={{
                flex: 1,
                maxWidth: 52,
                aspectRatio: 0.86,
                borderRadius: radius.button,
                borderCurve: "continuous",
                borderWidth: active ? 2 : 1.5,
                borderColor: error ? colors.danger : active ? colors.accent : char ? colors.label : colors.inputBorder,
                backgroundColor: char ? colors.cell : colors.inputBackground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.label, fontVariant: ["tabular-nums"] }}>{char}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, "").slice(0, LENGTH);
          onChange(digits);
          if (digits.length === LENGTH) onComplete(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        caretHidden
        accessibilityLabel={`${LENGTH}-digit code`}
        style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1, opacity: 0, borderWidth: 0, outlineWidth: 0 }}
      />
    </Pressable>
  );
}

/**
 * Enter the emailed code. ?mode=login (second step after the password, with ?ticket) or
 * ?mode=signup (confirms a new account), plus ?email for the message.
 */
export default function VerifyScreen() {
  const params = useLocalSearchParams();
  const mode = params.mode === "signup" ? "signup" : params.mode === "phone" ? "phone" : "login";
  const phone = typeof params.phone === "string" ? params.phone : "";
  const firstName = typeof params.firstName === "string" ? params.firstName : "";
  const lastName = typeof params.lastName === "string" ? params.lastName : "";
  const email = typeof params.email === "string" ? params.email : "";
  const ticket = typeof params.ticket === "string" ? params.ticket : "";
  const remember = params.remember !== "0";
  const insets = useSafeAreaInsets();
  const { verifyLoginCode, activateWithCode, signInWithPhone } = useAuth();
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(RESEND_AFTER);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Success swaps this screen for the app (see the root layout).
  const verify = useMutation({
    mutationFn: (value) =>
      mode === "phone" ? signInWithPhone(phone, value, firstName, lastName) : mode === "signup" ? activateWithCode(email, value) : verifyLoginCode(ticket, value, remember),
    onSuccess: () => haptic("success"),
    onError: () => {
      haptic("warning");
      setCode("");
    },
  });
  const resend = useMutation({
    mutationFn: () => (mode === "phone" ? api.auth.phoneCode(phone) : mode === "signup" ? api.auth.resendActivation(email) : api.auth.resendLoginCode(ticket)),
    onSuccess: () => {
      setWait(RESEND_AFTER);
      verify.reset();
    },
  });

  const error = verify.error ?? resend.error;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.cell }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: insets.bottom + 28 }}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={8}
        style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.steelBorder : colors.steel })}
      >
        <Icon name={{ sf: "chevron.left", md: "arrow_back_ios_new" }} size={18} color={colors.ink} weight="semibold" />
      </Pressable>

      <View style={{ marginTop: 24, gap: 10 }}>
        <ContainerPanel style={{ width: 68, height: 68, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
          <Icon name={mode === "phone" ? { sf: "message.fill", md: "sms" } : { sf: "envelope.fill", md: "mark_email_unread" }} size={30} color={colors.onAccent} />
        </ContainerPanel>
        <Text accessibilityRole="header" style={{ marginTop: 14, fontSize: 32, lineHeight: 35, fontWeight: "800", letterSpacing: -1.1, color: colors.ink }}>
          {mode === "phone" ? "Check your phone" : mode === "signup" ? "Confirm your email" : "Enter your code"}
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.secondaryLabel }}>
          We sent a {LENGTH}-digit code {mode === "phone" ? "by text message " : ""}to <Text style={{ fontWeight: "700", color: colors.label }}>{(mode === "phone" ? phone : email) || "you"}</Text>.{" "}
          {mode === "signup" ? "Enter it to activate your account." : mode === "phone" ? "Enter it to continue." : "Enter it to finish logging in."}
        </Text>
      </View>

      <View style={{ marginTop: 28, gap: 16 }}>
        <Banner message={error ? errorMessage(error) : null} />
        {resend.isSuccess && !error && <Banner tone="success" message="We sent you a new code." />}
        <CodeInput value={code} onChange={setCode} onComplete={(value) => verify.mutate(value)} error={!!verify.error} disabled={verify.isPending} />
        <Button
          title={mode === "login" ? "Verify and log in" : "Verify and continue"}
          variant="ink"
          onPress={() => verify.mutate(code)}
          loading={verify.isPending}
          disabled={code.length < LENGTH}
          style={{ marginTop: 8, minHeight: 56 }}
        />
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, minHeight: 44 }}>
          <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>Didn't get it?</Text>
          {wait > 0 ? (
            <Text style={{ fontSize: 15, color: colors.tertiaryLabel, fontVariant: ["tabular-nums"] }}>Resend in {wait}s</Text>
          ) : (
            <Text onPress={() => resend.mutate()} accessibilityRole="button" style={{ fontSize: 15, fontWeight: "700", color: resend.isPending ? colors.tertiaryLabel : colors.container }}>
              {resend.isPending ? "Sending…" : "Resend code"}
            </Text>
          )}
        </View>
        {mode === "phone" && (
          <Pressable onPress={() => router.back()} accessibilityRole="link" hitSlop={8} style={{ alignSelf: "center", minHeight: 44, justifyContent: "center", marginTop: -12 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.container }}>Change number</Text>
          </Pressable>
        )}
        <Text style={{ textAlign: "center", fontSize: 13, lineHeight: 19, color: colors.tertiaryLabel }}>
          {mode === "phone" ? "Texts can take a minute to arrive. The code expires after 10 minutes." : "Check your spam folder too. The code expires after 10 minutes."}
        </Text>
      </View>
    </ScrollView>
  );
}
