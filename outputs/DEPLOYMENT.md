# GitHub Pages deployment

The site is static and served from `public/` using GitHub Pages. The workflow `.github/workflows/pages.yml` deploys on pushes to `main`.

In GitHub repository Settings → Pages, set the build and deployment source to **GitHub Actions**. Attach the existing `bio.adhinvs.com` custom domain in Pages settings if desired, and configure the corresponding DNS records with your DNS provider.
