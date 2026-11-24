import { useRef, useState } from "react";
import { PROVIDER_KIND } from "@/accounts/accountView";
import { useCreateAccount, useShareAccount } from "@/api/hooks/accounts";
import {
	useCreateHostKey,
	useDetectHostKeyAccount,
} from "@/api/hooks/hostkeys";
import { useSetAccountPolicy } from "@/api/hooks/policyBindings";
import { ApiError, isShareExists } from "@/api/types/errors";
import type { ByokAccount } from "@/byok/byokChoices";
import type { ByokWrite } from "@/byok/byokWrites";
import { failureMessage, useWriteRunner } from "@/hooks/useWriteRunner";
import { type PickedScope, scopeOwner } from "@/lib/ownerPick";
import { required } from "@/lib/required";
import { slugWithSuffix } from "@/lib/slug";

export interface ByokSettings {
	hostId: string;
	scope: PickedScope;
	secret: string;
	/** The existing account the key joins; absent when the form makes one. */
	account?: ByokAccount;
}

/** A share the key's account didn't get, and why. */
export interface ShareFailure {
	/** The share write's id. */
	id: string;
	/** The team or project it was for. */
	label: string;
	message: string;
}

/** A team or project the account is shared with. */
export interface StoredShare {
	id: string;
	label: string;
	/** It held a share of the account, or reached it, before this request. */
	existing: boolean;
}

export interface StoredKey {
	/** Absent at a host that takes no key: only the account was made or set. */
	hostKeyName?: string;
	accountName: string;
	/** The request made the account rather than adding to an existing one. */
	accountMade: boolean;
	/** The organization the provider named for the key. */
	organization?: string;
	/** Why the provider named no organization for the key. */
	detectionNote?: string;
	/** Why the provider refused a call made with the key. */
	refusal?: string;
	shares: readonly StoredShare[];
	shareFailures: readonly ShareFailure[];
}

interface Progress {
	accountMade: boolean;
	accountId?: string;
	accountName?: string;
	hostKeyId?: string;
	hostKeyName?: string;
	organization?: string;
	refusal?: string;
	shareFailures: ShareFailure[];
}

function alreadyReaches(err: unknown): boolean {
	return (
		isShareExists(err) ||
		(err instanceof ApiError &&
			err.status === 409 &&
			err.body.code === "already_reachable")
	);
}

function storedKey(made: Progress): StoredKey {
	return {
		hostKeyName: required(made.hostKeyName, "key"),
		accountName: required(made.accountName, "account"),
		accountMade: made.accountMade,
		...(made.organization ? { organization: made.organization } : {}),
		...(made.refusal ? { refusal: made.refusal } : {}),
		shares: [],
		shareFailures: made.shareFailures,
	};
}

/** Sends a BYOK form's writes in order, each reading the ids the earlier ones returned. */
export function useByokWrites() {
	const createAccount = useCreateAccount();
	const setAccountPolicy = useSetAccountPolicy();
	const createHostKey = useCreateHostKey();
	const detectAccount = useDetectHostKeyAccount();
	const shareAccount = useShareAccount();

	const settingsRef = useRef<ByokSettings | null>(null);
	const progress = useRef<Progress>({ accountMade: false, shareFailures: [] });
	const [stored, setStored] = useState<StoredKey | null>(null);

	async function runWrite(write: ByokWrite): Promise<void> {
		const settings = required(settingsRef.current ?? undefined, "key");
		const made = progress.current;
		const owner = scopeOwner(settings.scope);
		const metadata = (displayName: string) => ({
			name: slugWithSuffix(displayName),
			displayName,
			...(owner ? { owner } : {}),
		});
		switch (write.kind) {
			case "account": {
				const account = await createAccount.mutateAsync({
					metadata: metadata(write.displayName),
					spec: { kind: PROVIDER_KIND, hostId: settings.hostId },
				});
				made.accountMade = true;
				made.accountId = account.metadata.id;
				made.accountName = account.metadata.name;
				return;
			}
			case "tier": {
				await setAccountPolicy.mutateAsync({
					accountRef: required(made.accountId, "account"),
					policyId: write.policyId,
				});
				return;
			}
			case "hostKey": {
				const key = await createHostKey.mutateAsync({
					metadata: metadata(write.displayName),
					spec: {
						hostId: settings.hostId,
						accountId: required(made.accountId, "account"),
						enabled: true,
						value: settings.secret,
						valueFrom: { kind: "stored" },
					},
				});
				made.hostKeyId = key.metadata.id;
				made.hostKeyName = key.metadata.name;
				return;
			}
			case "detect": {
				// The key is stored either way: a host that names no organizations
				// (422) is nothing to report, any other failure is, on the result.
				try {
					const detected = await detectAccount.mutateAsync(
						required(made.hostKeyId, "key"),
					);
					made.organization = detected.orgName?.trim() || detected.orgId;
				} catch (err) {
					if (!(err instanceof ApiError && err.status === 422)) {
						made.refusal = failureMessage(err);
					}
				}
				return;
			}
			case "share": {
				// The key is stored by now; a missed share is reported on the result.
				try {
					await shareAccount.mutateAsync({
						ref: required(made.accountId, "account"),
						receiver: write.receiver,
					});
				} catch (err) {
					if (!alreadyReaches(err)) {
						made.shareFailures.push({
							id: write.id,
							label: write.receiverLabel,
							message: failureMessage(err),
						});
					}
				}
				return;
			}
		}
	}

	const runner = useWriteRunner(runWrite);

	return {
		phase: runner.phase,
		error: runner.error,
		steps: runner.steps,
		doneCount: runner.doneCount,
		stored,
		retry: async () => {
			if (await runner.retry()) setStored(storedKey(progress.current));
		},
		reset() {
			setStored(null);
			runner.reset();
		},
		async start(settings: ByokSettings, writes: readonly ByokWrite[]) {
			settingsRef.current = settings;
			progress.current = settings.account
				? {
						accountMade: false,
						accountId: settings.account.id,
						accountName: settings.account.name,
						shareFailures: [],
					}
				: { accountMade: false, shareFailures: [] };
			setStored(null);
			if (await runner.start(writes)) setStored(storedKey(progress.current));
		},
	};
}
