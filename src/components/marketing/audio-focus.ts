// Na stránce hraje vždy jen jedna ukázka: kdo začne hrát, ohlásí to a ostatní se zastaví.
const EVENT = 'mk:audio-claim'

export function claimAudio(owner: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: owner }))
}

export function onAudioClaim(cb: (owner: string) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
