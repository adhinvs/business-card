# Deploying the digital card on Dokploy

1. Push the application files to a private Git repository and connect it to a new Docker Compose application in Dokploy.
2. Configure `bio.adhinvs.com` to route HTTPS requests to port `3000`.
3. Preserve the named `bio_card_data` volume mounted at `/data`; it stores the editable profile and administrator password hash.
4. Set `SESSION_SECRET` in Dokploy to a long random string so sessions remain valid across container restarts.
5. Deploy, visit `/admin`, and set the initial administrator password (minimum 12 characters). No default credentials are shipped.
6. Edit and publish your card. Program NFC tags with `https://bio.adhinvs.com/`.

Use Dokploy's volume backup facilities for `/data`. Keep the site behind HTTPS. The optional n8n webhook receives visitor details only after the visitor checks the consent box and submits; choose a webhook you control. Phone, photo, WhatsApp and location begin blank, and phone is hidden by default.
