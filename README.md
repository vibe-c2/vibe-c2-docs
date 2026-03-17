# vibe-c2-docs

Documentation project for defining early technical requirements and architecture for **Vibe C2**.

## Stack

- [MkDocs](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- GitHub Actions + GitHub Pages

## Local Development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve
```

Open `http://127.0.0.1:8000`.

## Project Structure

- `mkdocs.yml`: docs site configuration.
- `docs/`: markdown source content.
- `.github/workflows/deploy-docs.yml`: automated deployment workflow.

## Publish on GitHub Pages

1. Create an empty GitHub repository named `vibe-c2-docs`.
2. Update placeholders in `mkdocs.yml`:
   - `<your-github-username>`
3. Commit and push:

```bash
git add .
git commit -m "Initialize documentation boilerplate"
git remote add origin git@github.com:vibe-c2/vibe-c2-docs.git
git push -u origin main
```

4. In GitHub repository settings:
   - Open `Settings -> Pages`
   - Ensure source is `GitHub Actions`

After the first successful workflow run, the site URL will be:

`https://vibe-c2.github.io/vibe-c2-docs/`
