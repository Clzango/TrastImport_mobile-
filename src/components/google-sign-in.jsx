/**
 * Google sign-in on iOS/Android needs Google's native SDK (@react-native-google-signin/google-signin),
 * a development build and iOS/Android OAuth client IDs. Until that's set up, native shows no
 * Google button; the web version is in google-sign-in.web.jsx.
 */
export function GoogleSignInButton() {
  return null;
}
