import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { APK_PATH } from '../android.ts';

/**
 * The deploy adds the signed APK to static/ before building, so it ends up in build/client; in
 * development and while there is no signing key there is none, and nothing offers it.
 */
export const apkAvailable = existsSync(resolve('build/client' + APK_PATH));
