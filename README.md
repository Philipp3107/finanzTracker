# Finanz Tracker

## Login

The Nuxt frontend uses Cognito's hosted login for registration, verified email,
login and password recovery. OAuth uses Authorization Code with PKCE (S256),
state and nonce through `oidc-client-ts`. The public client has no client secret.

The infrastructure is in `../terraform/auth.tf`. Allowed callback and logout URLs
are in `../terraform/terraform.tfvars`; URLs must match exactly, including the
trailing slash. Review `terraform plan` before applying changes.

Public frontend settings are available with:

```sh
terraform -chdir=../terraform output -json auth_frontend_environment
```

Provide these settings through the local environment or `.env`, and through the
Amplify branch environment. `.env.example` documents the current public values:

- `NUXT_PUBLIC_COGNITO_AUTHORITY`
- `NUXT_PUBLIC_COGNITO_CLIENT_ID`
- `NUXT_PUBLIC_COGNITO_DOMAIN`

These are public identifiers, not credentials. Never add AWS credentials or a
client secret to public Nuxt configuration. Amplify builds the public
configuration into the app; environment changes require a new build.

## Development

```sh
npm install --prefix "$HOME/.local/share/finanztracker-corepack" corepack@0.34.0
node "$HOME/.local/share/finanztracker-corepack/node_modules/corepack/dist/corepack.js" enable --install-directory "$(dirname "$(command -v node)")" yarn
yarn install --immutable
NUXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_aBgyXUCzm \
NUXT_PUBLIC_COGNITO_CLIENT_ID=60v9enl4rfeea01d3idp5fo1b6 \
NUXT_PUBLIC_COGNITO_DOMAIN=https://finanztracker-eu-central-1-abgyxuczm.auth.eu-central-1.amazoncognito.com \
yarn dev --port 3000 --host 127.0.0.1
```

Open http://localhost:3000/. Use this exact origin, not `127.0.0.1` or a different
port, because Cognito explicitly allows only the configured callback URLs.

```sh
yarn typecheck
NITRO_PRESET=aws_amplify yarn build
```

Yarn 4.9.2 is pinned through `packageManager`. The project uses the standard
`node_modules` linker. Commit `yarn.lock` with dependency changes; do not create
an npm lockfile. Use `yarn add` and `yarn remove` to manage dependencies.

The production artifact is `.amplify-hosting`. Deploy frontend changes through
the existing Amplify Git workflow.

## Session and Security

Tokens live only in browser memory, never localStorage, sessionStorage or Nuxt's
SSR payload. Only the short-lived OAuth transaction (including the PKCE verifier)
is stored in sessionStorage so it survives the login redirect. The callback
removes OAuth parameters from the address bar. Reloading the page requires a new
login redirect, which may reuse Cognito's existing browser session. Access tokens
expire after 15 minutes; this initial version does not renew them automatically.
Logout attempts to revoke the refresh token, clears local tokens and ends the
Cognito hosted-login session. Already issued access tokens can remain valid
until expiry; future APIs must account for that.

TOTP MFA is enabled but optional in the pool. This version does not provide MFA
enrollment or enforce a second factor. Before using real financial data, decide
on and implement the MFA enrollment policy.

This is the login foundation only. There is no booking API or database access
from the frontend. Future APIs must validate access tokens and derive the owner
exclusively from the verified `sub`, never a client-supplied user ID. The PWA must
not cache authentication callbacks or financial API responses.

## Verification

Check on Safari and the installed iOS PWA:

1. Registration and email confirmation.
2. Login and return to the app with no code or state left in the URL.
3. Password recovery through the hosted login.
4. Logout and login again; reload and expired-session behavior.
5. Cancelled login and an invalid callback must not show an authenticated account.

An installed iOS PWA can open the login in a different browser context. Verify
that the callback returns to a context with the original sessionStorage state;
otherwise login must fail closed rather than accepting an unverified callback.

The previous npm installation reported high/critical findings in the Nuxt
dependency tree. Check the current Yarn lockfile with `yarn npm audit --all --recursive`
before a production release and review dependency updates explicitly.
