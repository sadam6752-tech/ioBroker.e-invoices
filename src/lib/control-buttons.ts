/**
 * The control states that are buttons. `control.issueId` and `control.restoreId` are inputs of the buttons
 * `control.issue` and `control.restore`; writing them starts nothing.
 */
export const BUTTON_STATES: ReadonlySet<string> = new Set(['createDraft', 'issue', 'refresh', 'backup', 'restore']);

/**
 * Whether a state change is a press on a control button: a command from outside (`ack` false), the value `true`
 * (writing `false` or anything else must not issue or restore anything), and one of the button states.
 *
 * @param namespace - Namespace of the instance, e.g. `e-invoices.0`.
 * @param id - Full id of the changed state.
 * @param state - The new state, or null when it was deleted.
 */
export function isButtonPress(
	namespace: string,
	id: string,
	state: { ack: boolean; val: unknown } | null | undefined,
): boolean {
	const prefix = `${namespace}.control.`;
	return (
		Boolean(state) &&
		state?.ack === false &&
		state.val === true &&
		id.startsWith(prefix) &&
		BUTTON_STATES.has(id.slice(prefix.length))
	);
}
