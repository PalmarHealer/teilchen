import type { SubmitFunction } from '$app/forms';
import { toast } from 'svelte-sonner';
import type { MessageKey } from './i18n/index.ts';

type Translate = (key: MessageKey) => string;
type Data = Record<string, unknown> | undefined;

/**
 * A `use:enhance` callback that reports the action's outcome as a toast instead of text in the
 * page (which would push the layout around). Failures carry a message key in `message`,
 * `manageError` or `uploadError`; `success` turns the action's data into a confirmation.
 */
export function withToast(
	t: Translate,
	opts: {
		success?: (data: Data) => string | undefined;
		/** Shown while the action runs, e.g. for uploads */
		loading?: string;
		reset?: boolean;
		/** Runs once the result is in, before the page updates */
		done?: () => void;
	} = {}
): SubmitFunction {
	return () => {
		const id = opts.loading ? toast.loading(opts.loading) : undefined;
		return async ({ result, update }) => {
			opts.done?.();
			await update({ reset: opts.reset ?? true });
			if (result.type === 'failure') {
				const d = result.data;
				const key = (d?.message ?? d?.manageError ?? d?.uploadError) as MessageKey | undefined;
				toast.error(t(key ?? 'errors.generic'), { id });
			} else if (result.type === 'success') {
				const text = opts.success?.(result.data);
				if (text) toast.success(text, { id });
				else if (id !== undefined) toast.dismiss(id);
			} else if (id !== undefined) {
				toast.dismiss(id);
			}
		};
	};
}

export { toast };
