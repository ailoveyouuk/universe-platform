export const msalConfig = {
  auth: {
    clientId:    process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? '',
    authority:   `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID ?? 'common'}`,
    redirectUri: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3003',
  },
  cache: {
    cacheLocation:          'localStorage' as const,
    storeAuthStateInCookie: true,
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}

export const apiRequest = {
  scopes: [`api://${process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? ''}/access_as_user`],
}
