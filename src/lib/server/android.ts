import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The signed APK, which the deploy puts into the release next to the server build. In
 * development and while there is no signing key there is none, and nothing offers it.
 */
export const APK_FILE = resolve('build/android/teilchen.apk');
export const apkAvailable = existsSync(APK_FILE);
