import { useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/text";
import { countryFlag, countryName } from "@/lib/format";
import { colors, radius } from "@/lib/theme";
import { haptic, Icon } from "./ui";

// ISO region, E.164 calling code and English fallback name. Territories sharing a
// numbering plan remain separate choices so the flag and country label stay clear.
const COUNTRY_CODES = [
  ["AD", "376", "Andorra"], ["AE", "971", "United Arab Emirates"], ["AF", "93", "Afghanistan"], ["AG", "1", "Antigua and Barbuda"], ["AI", "1", "Anguilla"], ["AL", "355", "Albania"], ["AM", "374", "Armenia"], ["AO", "244", "Angola"], ["AR", "54", "Argentina"], ["AS", "1", "American Samoa"], ["AT", "43", "Austria"], ["AU", "61", "Australia"], ["AW", "297", "Aruba"], ["AZ", "994", "Azerbaijan"],
  ["BA", "387", "Bosnia and Herzegovina"], ["BB", "1", "Barbados"], ["BD", "880", "Bangladesh"], ["BE", "32", "Belgium"], ["BF", "226", "Burkina Faso"], ["BG", "359", "Bulgaria"], ["BH", "973", "Bahrain"], ["BI", "257", "Burundi"], ["BJ", "229", "Benin"], ["BM", "1", "Bermuda"], ["BN", "673", "Brunei"], ["BO", "591", "Bolivia"], ["BQ", "599", "Caribbean Netherlands"], ["BR", "55", "Brazil"], ["BS", "1", "Bahamas"], ["BT", "975", "Bhutan"], ["BW", "267", "Botswana"], ["BY", "375", "Belarus"], ["BZ", "501", "Belize"],
  ["CA", "1", "Canada"], ["CD", "243", "DR Congo"], ["CF", "236", "Central African Republic"], ["CG", "242", "Republic of the Congo"], ["CH", "41", "Switzerland"], ["CI", "225", "Côte d’Ivoire"], ["CL", "56", "Chile"], ["CM", "237", "Cameroon"], ["CN", "86", "China"], ["CO", "57", "Colombia"], ["CR", "506", "Costa Rica"], ["CU", "53", "Cuba"], ["CV", "238", "Cabo Verde"], ["CW", "599", "Curaçao"], ["CY", "357", "Cyprus"], ["CZ", "420", "Czechia"],
  ["DE", "49", "Germany"], ["DJ", "253", "Djibouti"], ["DK", "45", "Denmark"], ["DM", "1", "Dominica"], ["DO", "1", "Dominican Republic"], ["DZ", "213", "Algeria"],
  ["EC", "593", "Ecuador"], ["EE", "372", "Estonia"], ["EG", "20", "Egypt"], ["ER", "291", "Eritrea"], ["ES", "34", "Spain"], ["ET", "251", "Ethiopia"],
  ["FI", "358", "Finland"], ["FJ", "679", "Fiji"], ["FM", "691", "Micronesia"], ["FO", "298", "Faroe Islands"], ["FR", "33", "France"],
  ["GA", "241", "Gabon"], ["GB", "44", "United Kingdom"], ["GD", "1", "Grenada"], ["GE", "995", "Georgia"], ["GH", "233", "Ghana"], ["GM", "220", "Gambia"], ["GN", "224", "Guinea"], ["GQ", "240", "Equatorial Guinea"], ["GR", "30", "Greece"], ["GT", "502", "Guatemala"], ["GW", "245", "Guinea-Bissau"], ["GY", "592", "Guyana"],
  ["HK", "852", "Hong Kong"], ["HN", "504", "Honduras"], ["HR", "385", "Croatia"], ["HT", "509", "Haiti"], ["HU", "36", "Hungary"],
  ["ID", "62", "Indonesia"], ["IE", "353", "Ireland"], ["IL", "972", "Israel"], ["IN", "91", "India"], ["IQ", "964", "Iraq"], ["IR", "98", "Iran"], ["IS", "354", "Iceland"], ["IT", "39", "Italy"],
  ["JM", "1", "Jamaica"], ["JO", "962", "Jordan"], ["JP", "81", "Japan"],
  ["KE", "254", "Kenya"], ["KG", "996", "Kyrgyzstan"], ["KH", "855", "Cambodia"], ["KI", "686", "Kiribati"], ["KM", "269", "Comoros"], ["KN", "1", "Saint Kitts and Nevis"], ["KP", "850", "North Korea"], ["KR", "82", "South Korea"], ["KW", "965", "Kuwait"], ["KY", "1", "Cayman Islands"], ["KZ", "7", "Kazakhstan"],
  ["LA", "856", "Laos"], ["LB", "961", "Lebanon"], ["LC", "1", "Saint Lucia"], ["LI", "423", "Liechtenstein"], ["LK", "94", "Sri Lanka"], ["LR", "231", "Liberia"], ["LS", "266", "Lesotho"], ["LT", "370", "Lithuania"], ["LU", "352", "Luxembourg"], ["LV", "371", "Latvia"], ["LY", "218", "Libya"],
  ["MA", "212", "Morocco"], ["MC", "377", "Monaco"], ["MD", "373", "Moldova"], ["ME", "382", "Montenegro"], ["MG", "261", "Madagascar"], ["MH", "692", "Marshall Islands"], ["MK", "389", "North Macedonia"], ["ML", "223", "Mali"], ["MM", "95", "Myanmar"], ["MN", "976", "Mongolia"], ["MO", "853", "Macau"], ["MR", "222", "Mauritania"], ["MT", "356", "Malta"], ["MU", "230", "Mauritius"], ["MV", "960", "Maldives"], ["MW", "265", "Malawi"], ["MX", "52", "Mexico"], ["MY", "60", "Malaysia"], ["MZ", "258", "Mozambique"],
  ["NA", "264", "Namibia"], ["NE", "227", "Niger"], ["NG", "234", "Nigeria"], ["NI", "505", "Nicaragua"], ["NL", "31", "Netherlands"], ["NO", "47", "Norway"], ["NP", "977", "Nepal"], ["NR", "674", "Nauru"], ["NZ", "64", "New Zealand"],
  ["OM", "968", "Oman"],
  ["PA", "507", "Panama"], ["PE", "51", "Peru"], ["PG", "675", "Papua New Guinea"], ["PH", "63", "Philippines"], ["PK", "92", "Pakistan"], ["PL", "48", "Poland"], ["PR", "1", "Puerto Rico"], ["PS", "970", "Palestine"], ["PT", "351", "Portugal"], ["PW", "680", "Palau"], ["PY", "595", "Paraguay"],
  ["QA", "974", "Qatar"],
  ["RO", "40", "Romania"], ["RS", "381", "Serbia"], ["RU", "7", "Russia"], ["RW", "250", "Rwanda"],
  ["SA", "966", "Saudi Arabia"], ["SB", "677", "Solomon Islands"], ["SC", "248", "Seychelles"], ["SD", "249", "Sudan"], ["SE", "46", "Sweden"], ["SG", "65", "Singapore"], ["SI", "386", "Slovenia"], ["SK", "421", "Slovakia"], ["SL", "232", "Sierra Leone"], ["SM", "378", "San Marino"], ["SN", "221", "Senegal"], ["SO", "252", "Somalia"], ["SR", "597", "Suriname"], ["SS", "211", "South Sudan"], ["ST", "239", "São Tomé and Príncipe"], ["SV", "503", "El Salvador"], ["SY", "963", "Syria"], ["SZ", "268", "Eswatini"],
  ["TD", "235", "Chad"], ["TG", "228", "Togo"], ["TH", "66", "Thailand"], ["TJ", "992", "Tajikistan"], ["TL", "670", "Timor-Leste"], ["TM", "993", "Turkmenistan"], ["TN", "216", "Tunisia"], ["TO", "676", "Tonga"], ["TR", "90", "Türkiye"], ["TT", "1", "Trinidad and Tobago"], ["TV", "688", "Tuvalu"], ["TW", "886", "Taiwan"], ["TZ", "255", "Tanzania"],
  ["UA", "380", "Ukraine"], ["UG", "256", "Uganda"], ["US", "1", "United States"], ["UY", "598", "Uruguay"], ["UZ", "998", "Uzbekistan"],
  ["VA", "39", "Vatican City"], ["VC", "1", "Saint Vincent and the Grenadines"], ["VE", "58", "Venezuela"], ["VG", "1", "British Virgin Islands"], ["VN", "84", "Vietnam"], ["VU", "678", "Vanuatu"],
  ["WS", "685", "Samoa"], ["YE", "967", "Yemen"], ["ZA", "27", "South Africa"], ["ZM", "260", "Zambia"], ["ZW", "263", "Zimbabwe"],
].map(([iso, dial, name]) => ({ iso, dial, name, label: countryName(iso, name) }));

const BY_CODE = new Map(COUNTRY_CODES.map((country) => [country.iso, country]));
const DIAL_CODES = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);

function splitPhone(value, defaultCountry) {
  const compact = String(value ?? "").replace(/[\s().-]/g, "");
  const iso = String(defaultCountry ?? "").toUpperCase();
  if (compact.startsWith("+")) {
    const match = DIAL_CODES.find((country) => compact.slice(1).startsWith(country.dial));
    if (match) {
      const sameDialAndRegion = BY_CODE.get(iso)?.dial === match.dial ? BY_CODE.get(iso) : match;
      return { country: sameDialAndRegion, number: compact.slice(1 + sameDialAndRegion.dial.length).replace(/\D/g, "") };
    }
  }
  return { country: BY_CODE.get(iso) ?? BY_CODE.get("CN"), number: compact.replace(/\D/g, "") };
}

function toInternational(country, number) {
  const local = String(number ?? "").replace(/\D/g, "").slice(0, 15 - country.dial.length);
  return local ? `+${country.dial}${local}` : "";
}

export function PhoneField({ label = "Phone", value, onChangeText, defaultCountryCode = "CN", error, placeholder = "Phone number" }) {
  const insets = useSafeAreaInsets();
  const [initial] = useState(() => splitPhone(value, defaultCountryCode));
  const [selected, setSelected] = useState(initial.country);
  const [number, setNumber] = useState(initial.number);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const query = search.trim().toLocaleLowerCase();
  const results = query
    ? COUNTRY_CODES.filter((country) => country.label.toLocaleLowerCase().includes(query) || country.name.toLocaleLowerCase().includes(query) || country.iso.toLowerCase() === query || `+${country.dial}`.includes(query.startsWith("+") ? query : `+${query}`))
    : COUNTRY_CODES;
  const selectCountry = (country) => {
    haptic();
    setSelected(country);
    setOpen(false);
    setSearch("");
    onChangeText(toInternational(country, number));
  };
  const updateNumber = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 15 - selected.dial.length);
    setNumber(digits);
    onChangeText(toInternational(selected, digits));
  };

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontSize: 14, fontWeight: "600", color: colors.label }}>{label}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 52, borderWidth: 1.5, borderColor: error ? colors.danger : focused ? colors.accent : colors.inputBorder, borderRadius: radius.button, borderCurve: "continuous", backgroundColor: colors.inputBackground, boxShadow: focused ? "0 0 0 3px rgba(194,69,12,0.14)" : undefined }}>
        <Pressable
          onPress={() => { setSearch(""); setOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`Country calling code, ${selected.label} +${selected.dial}`}
          style={({ pressed }) => ({ minHeight: 49, flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 9, opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={{ fontSize: 18 }}>{countryFlag(selected.iso)}</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.label }}>+{selected.dial}</Text>
          <Icon name={{ sf: "chevron.down", md: "expand_more" }} size={14} color={colors.secondaryLabel} />
        </Pressable>
        <View style={{ width: 1, height: 26, backgroundColor: colors.border }} />
        <TextInput
          value={number}
          onChangeText={updateNumber}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="phone-pad"
          maxLength={15 - selected.dial.length}
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          placeholder={placeholder}
          placeholderTextColor={colors.tertiaryLabel}
          selectionColor={colors.accent}
          accessibilityLabel={`${label} without country code`}
          style={{ flex: 1, minWidth: 0, minHeight: 49, paddingHorizontal: 12, fontSize: 16, color: colors.label, outlineWidth: 0, outlineStyle: "none", outlineColor: "transparent" }}
        />
      </View>
      {error ? <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text> : null}
      <Text style={{ fontSize: 12, lineHeight: 17, color: colors.tertiaryLabel }}>Choose your country code, then enter the number without a domestic prefix like 0.</Text>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(13,31,51,0.42)" }}>
          <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close country picker" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
          <View style={{ maxHeight: "84%", width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: colors.cell, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: insets.bottom + 12, overflow: "hidden" }}>
            <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.segment, marginTop: 9, marginBottom: 12 }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 }}>
              <Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: "800", color: colors.label }}>Choose country code</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close country picker" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" }}>
                <Icon name={{ sf: "xmark", md: "close" }} size={16} color={colors.secondaryLabel} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search country or code"
                placeholderTextColor={colors.tertiaryLabel}
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Search country calling codes"
                style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: radius.cell, backgroundColor: colors.fill, fontSize: 15, color: colors.label, outlineWidth: 0, outlineStyle: "none" }}
              />
            </View>
            <FlatList
              data={results}
              keyExtractor={(country) => country.iso}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.separator, marginLeft: 58 }} />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectCountry(item)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: item.iso === selected.iso }}
                  style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, backgroundColor: pressed ? colors.fill : "transparent" })}
                >
                  <Text style={{ width: 28, fontSize: 21, textAlign: "center" }}>{countryFlag(item.iso)}</Text>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: item.iso === selected.iso ? "700" : "500", color: colors.label }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.secondaryLabel }}>+{item.dial}</Text>
                  {item.iso === selected.iso ? <Icon name={{ sf: "checkmark", md: "check" }} size={17} color={colors.accent} weight="bold" /> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ padding: 24, textAlign: "center", fontSize: 14, color: colors.secondaryLabel }}>No country matches that search.</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
