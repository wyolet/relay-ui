import { useRef, useState } from "react";
import { PROVIDER_KIND } from "@/accounts/accountView";
import { useCreateAccount, useShareAccount } from "@/api/hooks/accounts";
import {
	useCreateHostKey,
	useDetectHostKeyAccount,
} from "@/api/hooks/hostkeys";
import { useSetAccountPolicy } from "@/api/hooks/policyBindings";
import { ApiError } from "@/api/types/errors";
import type { ByokAccount } from "@/byok/byokChoices";
import type { ByokWrite } from "@/byok/byokWrites";
import { useWriteRunner } from "@/hooks/useWriteRunner";
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

export interface StoredKey {
	hostKeyName: string;
	accountName: string;
	/** The organization the provider named for the key. */
	organization?: string;
	/** Why the provider refused a call made with the key. */
	refusal?: string;
}

interface Progress {
	accountId?: string;
	accountName?: string;
	hostKeyId?: string;
	hostKeyName?: string;
	organization?: string;
	refusal?: string;
}

function alreadyReaches(err: unknown): boolean {
	return (
		err instanceof ApiError &&
		err.status === 409 &&
		(err.body.code === "already_reachable" || err.body.code === "share_exists")
	);
}

function storedKey(made: Progress): StoredKey {
	return {
		hostKeyName: required(made.hostKeyName, "key"),
		accountName: required(made.accountName, "account"),
		...(made.organization ? { organization: made.organization } : {}),
		...(made.refusal ? { refusal: made.refusal } : {}),
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
	const progress = useRef<Progress>({});
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
				// (422) is nothing to report, a refused call (502) is, on the result.
				try {
					const detected = await detectAccount.mutateAsync(
						required(made.hostKeyId, "key"),
					);
					made.organization = detected.orgName?.trim() || detected.orgId;
				} catch (err) {
					if (err instanceof ApiError && err.status === 502) {
						made.refusal = err.body.message || "The provider refused the call.";
					}
				}
				return;
			}
			case "share": {
				try {
					await shareAccount.mutateAsync({
						ref: required(made.accountId, "account"),
						receiver: write.receiver,
					});
				} catch (err) {
					if (!alreadyReaches(err)) throw err;
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
		stored,
		retry: async () => {
			if (await runner.retry()) setStored(storedKey(progress.current));
		},
		async start(settings: ByokSettings, writes: readonly ByokWrite[]) {
			settingsRef.current = settings;
			progress.current = settings.account
				? {
						accountId: settings.account.id,
						accountName: settings.account.name,
					}
				: {};
			setStored(null);
			if (await runner.start(writes)) setStored(storedKey(progress.current));
		},
	};
}
