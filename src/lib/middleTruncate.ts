/** A long id cut in the middle so both ends stay readable: "ed468e69…f629". */
export function middleTruncate(value: string, head = 8, tail = 4): string {
	return value.length > head + tail + 2
		? `${value.slice(0, head)}…${value.slice(-tail)}`
		: value;
}
