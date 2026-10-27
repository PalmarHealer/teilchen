import { error } from '@sveltejs/kit';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { APK_FILE, apkAvailable } from '#lib/server/android.ts';
import type { RequestHandler } from './$types';

/**
 * The Android app. Not a static file: Android only offers to install it with the APK content
 * type, and browsers would otherwise guess "zip" (an APK is one inside).
 */
export const GET: RequestHandler = async () => {
	if (!apkAvailable) error(404, 'errors.appNotAvailable');
	const { size, mtime } = await stat(APK_FILE);
	return new Response(Readable.toWeb(createReadStream(APK_FILE)) as ReadableStream, {
		headers: {
			'content-type': 'application/vnd.android.package-archive',
			'content-disposition': 'attachment; filename="teilchen.apk"',
			'content-length': String(size),
			'last-modified': mtime.toUTCString(),
			'cache-control': 'no-cache'
		}
	});
};
