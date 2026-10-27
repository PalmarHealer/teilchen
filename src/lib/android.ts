/** The Android app: a Trusted Web Activity around this site, built by CI from android/. */
export const ANDROID_PACKAGE = 'de.nauren.teilchen';

/** Where the signed APK is served (see routes/teilchen.apk). */
export const APK_PATH = '/teilchen.apk';

/**
 * SHA-256 fingerprint of the APK signing key ("AB:CD:…"). It is public: the Digital Asset Links
 * built from it let the app show the site without an address bar. CI fails when the keystore
 * doesn't match it. Null until the key exists.
 */
export const ANDROID_CERT_SHA256: string | null =
	'B4:F4:91:B3:D8:50:9A:91:D8:72:32:F8:AE:3D:AC:05:01:B7:06:FB:3A:F1:41:E5:AD:6C:AD:11:46:3A:39:8B';
