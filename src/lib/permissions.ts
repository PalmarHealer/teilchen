/**
 * Who may edit or delete an expense: whoever added it, and in a group also the group's creator.
 * Settlements are a batch across contexts, so only whoever recorded them may undo them.
 */
export function canManageExpense(
	me: string,
	expense: { createdBy: string; kind: 'expense' | 'settlement' },
	groupCreatedBy: string | null
): boolean {
	if (expense.createdBy === me) return true;
	return expense.kind === 'expense' && groupCreatedBy === me;
}
