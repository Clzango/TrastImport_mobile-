import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/text";
import { Button, Icon, Screen } from "@/components/ui";
import { colors, radius } from "@/lib/theme";

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

const FAQ = [
  {
    q: "How do I contact a supplier or shipping company?",
    a: "Open the company's page and tap Contact Supplier or Contact Company. Your conversation appears under Messages, and you get a reply there.",
  },
  {
    q: "How do I get a price quote?",
    a: "Tap Request Quote (or Request Shipping Quote) on the company's page. We start a message with the details they need; fill them in and send.",
  },
  {
    q: "What does Verified mean?",
    a: "TrastImport checked the company's documents before marking it Verified. Still ask for samples and certificates before a large order.",
  },
  {
    q: "I own a company listed here. How do I manage it?",
    a: "Open its page and tap Claim this company. After an admin approves your claim you can edit the listing, answer messages and reply to reviews.",
  },
  {
    q: "I didn't get my code or confirmation email.",
    a: "Check your spam folder, then use Resend on the code screen. Codes expire after 10 minutes.",
  },
];

function Item({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((o) => !o)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.separator, gap: 8 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.label }}>{q}</Text>
        <Icon name={open ? { sf: "chevron.up", md: "expand_less" } : { sf: "chevron.down", md: "expand_more" }} size={16} color={colors.secondaryLabel} />
      </View>
      {open && <Text style={{ fontSize: 14, lineHeight: 21, color: colors.secondaryLabel }}>{a}</Text>}
    </Pressable>
  );
}

export default function HelpScreen() {
  return (
    <Screen contentContainerStyle={{ backgroundColor: colors.cell, gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "800", color: colors.label }}>
        Help & Support
      </Text>
      <View>
        {FAQ.map((f) => (
          <Item key={f.q} {...f} />
        ))}
      </View>
      <View style={{ marginTop: 16, padding: 16, gap: 10, borderRadius: radius.card, backgroundColor: colors.accentSoft }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.label }}>Still need help?</Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: colors.bodyText }}>
          {SUPPORT_EMAIL ? "Email our team and we'll get back to you." : "Message the company directly from its page; most questions are about a specific order."}
        </Text>
        {SUPPORT_EMAIL ? (
          <Button title={`Email ${SUPPORT_EMAIL}`} icon={{ sf: "envelope", md: "mail" }} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} style={{ borderRadius: 999 }} />
        ) : (
          <Button title="Go to Messages" variant="accentOutline" onPress={() => router.navigate("/messages")} style={{ borderRadius: 999 }} />
        )}
      </View>
    </Screen>
  );
}
