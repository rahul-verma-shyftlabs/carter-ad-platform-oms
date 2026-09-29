import { NextApiResponse } from 'next';

type OAuthHandoffPayload = {
  success: boolean;
  salesforceToken?: string;
  mondayToken?: string;
  mondayUserId?: string;
  userId?: string;
  crmBackendToken?: string;
  error?: string;
  redirectUrl: string;
};

export const sendOAuthHandoffPage = (res: NextApiResponse, payload: OAuthHandoffPayload) => {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Core OMS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#fafafa; }
      .box { text-align:center; color:#111827; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>${payload.success ? 'Connected' : 'Connection failed'}</h1>
      <p>${payload.success ? 'You can close this window.' : payload.error || 'Please try again.'}</p>
    </div>
    <script>
      (function () {
        var payload = ${JSON.stringify({
          type: 'oms:oauth:complete',
          v: 1,
          salesforceToken: payload.salesforceToken,
          mondayToken: payload.mondayToken,
          mondayUserId: payload.mondayUserId,
          userId: payload.userId,
          crmBackendToken: payload.crmBackendToken,
          error: payload.error,
        })};
        var redirectUrl = ${JSON.stringify(payload.redirectUrl)};
        try {
          sessionStorage.setItem('oms_oauth_handoff', JSON.stringify({
            salesforceToken: payload.salesforceToken,
            mondayToken: payload.mondayToken,
            mondayUserId: payload.mondayUserId,
            userId: payload.userId,
            crmBackendToken: payload.crmBackendToken
          }));
        } catch (e) {}
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, '*');
          window.close();
          return;
        }
        window.location.replace(redirectUrl);
      })();
    </script>
  </body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(html);
};
