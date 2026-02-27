# Videos

Place your portrait MP4 video files here. Then update the `VIDEOS` array in `src/main.ts` with the filenames.

## Placeholder files expected

- `sri_lanka.mp4`
- `uk_glastonbury.mp4`
- `india.mp4`

## File size limits

- GitHub web UI upload: max **25 MB per file**
- Git CLI push: max **100 MB per file**
- For larger iPhone videos, use [Git LFS](https://git-lfs.com/):

```bash
git lfs install
git lfs track "*.mp4"
git add .gitattributes
```

GitHub free accounts include 1 GB of LFS storage.

## Adding more videos

1. Add your `.mp4` file to this folder
2. Open `src/main.ts`
3. Add an entry to the `VIDEOS` array:
   ```ts
   { url: 'videos/your_video.mp4', title: 'Your Title' }
   ```
4. Commit and push → GitHub Actions will rebuild and deploy automatically
