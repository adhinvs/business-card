# Adhin V S · Digital card

Static, client-side personal profile card. No server, database, analytics, or webhook is required. The contact card is generated in the visitor’s browser, and Exchange Contacts opens the configured Walink destination.

## Deploy with GitHub Pages

The repository includes a GitHub Actions workflow that publishes the existing `public/` site to GitHub Pages on pushes to `main`. In repository Settings → Pages, choose **GitHub Actions** as the source. The public site keeps its existing design and links.

## Contact details

The Save Contact button creates a vCard 3.0 file in the browser with the supplied contact and social details. Exchange Contacts redirects directly to `https://walink.me/dbu7dq`.

## Privacy

There is no server-side collection, profile editor, visitor tracking, or webhook. `robots.txt` and the page’s `noindex` metadata ask crawlers not to index the card; this is not access control.
