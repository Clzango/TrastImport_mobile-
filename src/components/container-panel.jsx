import { View } from "react-native";
import { colors } from "@/lib/theme";

const RIB = 26; // one corrugation: 22px flat face, a 2px shadow groove, a 2px highlight
const RIBS = Array.from({ length: 40 }, (_, i) => i);

/**
 * The navy hero surface (the "departure board"), with faint vertical ribs like the side of a container.
 * Used for the one hero surface per screen (next departure, company cover, sign-in header).
 */
export function ContainerPanel({ color = colors.navy, rib = "rgba(255,255,255,0.045)", shine = "transparent", style, children }) {
  return (
    <View style={[{ backgroundColor: color, overflow: "hidden", borderCurve: "continuous" }, style]}>
      <View pointerEvents="none" accessible={false} style={{ position: "absolute", top: 0, bottom: 0, left: 0, flexDirection: "row" }}>
        {RIBS.map((i) => (
          <View key={i} style={{ width: RIB, flexDirection: "row" }}>
            <View style={{ width: RIB - 4 }} />
            <View style={{ width: 2, backgroundColor: rib }} />
            <View style={{ width: 2, backgroundColor: shine }} />
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}
