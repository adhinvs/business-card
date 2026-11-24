# Bio Card

A self-hosted, single-owner digital networking card for `bio.adhinvs.com`. The public card is the domain root. The admin editor is at `/admin`.

## Deploy with Dokploy

1. Push this folder to a private Git repository and create a Docker Compose application in Dokploy from that repository.
2. Set the domain to `bio.adhinvs.com`, route HTTPS traffic to service port `5877`, and enable certificate provisioning.
3. Keep the named `bio_card_data` volume attached at `/data` for persistent profile and password data.
4. Add `SESSION_SECRET` as a long random value in the Dokploy environment. This signs session cookies. If omitted, the app generates an ephemeral key on each restart and current sessions will sign out.
5. Deploy, open `https://bio.adhinvs.com/admin`, and create the first administrator password. Use at least 12 characters. There are no default public credentials.
6. NFC tags can point directly to `https://bio.adhinvs.com/`. Share or scan the QR code shown on the card.

The container has a health check at `/api/health`. A persistent named volume is created by Compose; back it up with your normal Dokploy volume backup process.

## Profile and privacy

Profile editing is available at `/admin`: identity, bio, image, links, accent/background colours, WhatsApp number and prefilled message, and contact visibility. Email and website are prefilled from the public site; phone, WhatsApp number, photo, and location are blank. Phone visibility is off by default. Save changes with **Publish changes**.

Contact exchange is optional and requires explicit visitor consent plus a name and at least one contact method. Data is forwarded to the configured n8n webhook and is not retained by this app. Without a webhook, the form still confirms submission but does not persist the submitted details. Only configure a webhook endpoint you control, preferably over HTTPS.

Analytics are privacy-conscious aggregate event counts held in memory. The app does not store IP addresses, cookies for visitors, or visitor identifiers. Counts reset when the container restarts. Administrator sessions use signed, HttpOnly, SameSite=Strict cookies; only the password hash is persisted. Serve the app behind HTTPS in Dokploy.

The contact file at `/card.vcf` includes only contact fields enabled for public display. Visitor-submitted contact details are not included.

## Local development

Requires Node.js 20 or newer. Run `npm start`, then open `http://localhost:3000`. Profile data is stored in `./data` unless `DATA_DIR` is set. First visit to `/admin` creates the administrator password.

## Configuration

- `PORT`: HTTP port (default `3000`)
- `DATA_DIR`: persistent data directory (default `./data`)
- `SESSION_SECRET`: stable secret for signed sessions; set in Dokploy
- `PUBLIC_URL`: deployment domain reference in Compose; QR uses the current root URL
