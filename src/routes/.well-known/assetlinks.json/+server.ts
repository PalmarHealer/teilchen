import { json } from '@sveltejs/kit';
import { ANDROID_CERT_SHA256, ANDROID_PACKAGE } from '#lib/android.ts';
import type { RequestHandler } from './$types';

/** Digital Asset Links: the Android app may open this site full screen. */
export const GET: RequestHandler = () =>
	json(
		ANDROID_CERT_SHA256
			? [
					{
						relation: ['delegate_permission/common.handle_all_urls'],
						target: {
							namespace: 'android_app',
							package_name: ANDROID_PACKAGE,
							sha256_cert_fingerprints: [ANDROID_CERT_SHA256]
						}
					}
				]
			: []
	);
