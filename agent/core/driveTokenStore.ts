export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export class DriveTokenStore {
  private tokens: OAuthTokens | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  }

  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
  }

  isConnected(): boolean {
    return this.tokens !== null;
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;
    const BUFFER_MS = 60_000;
    if (Date.now() < this.tokens.expiry_date - BUFFER_MS) {
      return this.tokens.access_token;
    }
    return this.refresh();
  }

  getAuthUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      ...(state ? { state } : {}),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<void> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Token exchange failed: ${err}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    this.setTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: Date.now() + data.expires_in * 1000,
    });
  }

  private async refresh(): Promise<string | null> {
    if (!this.tokens?.refresh_token) return null;
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        console.error("[DriveTokenStore] Token refresh failed:", await res.text());
        this.tokens = null;
        return null;
      }

      const data = (await res.json()) as {
        access_token: string;
        expires_in: number;
      };

      this.tokens = {
        ...this.tokens,
        access_token: data.access_token,
        expiry_date: Date.now() + data.expires_in * 1000,
      };

      return this.tokens.access_token;
    } catch (err) {
      console.error("[DriveTokenStore] Refresh error:", err);
      return null;
    }
  }

  serialize(): OAuthTokens | null {
    return this.tokens ? { ...this.tokens } : null;
  }

  restore(tokens: OAuthTokens): void {
    this.tokens = tokens;
  }

  disconnect(): void {
    this.tokens = null;
  }
}