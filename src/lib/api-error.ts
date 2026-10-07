/** Chyba API volání s tělem odpovědi (kvůli rozpoznání kódů limitů, např. AGENT_LIMIT_REACHED). */
export class ApiError extends Error {
  constructor(
    message: string,
    public body: unknown,
    public status: number
  ) {
    super(message)
  }
}
