# Cantonese brush forms

Both writing pages use Hanzi Writer. The supplemental artwork ships as versioned static files on the frontend deployment. The standard characters load from the pinned upstream data package. The shared loader and the coverage command use the same catalogue in `config/writing-strokes.json`.

## Review of version 1

The project owner approved the appearance of the 36 brush forms on 20 November 2026. The sheet below shows them rendered by Hanzi Writer.

When revising the artwork, compare 搵 with 揾, check the claw at the top of 爲, and play 𨋢 and 𠱸 to inspect stroke order and direction.

![36 supplemental characters with their labels and stroke counts](cantonese-brush-forms.png)

## Check new content

Run `npm run check:strokes` from the frontend checkout with the sibling `openai-tts` repository available. To check a downloaded word snapshot, pass `-- --words /path/to/words`. For offline use, also pass `--inventory /path/to/inventory.json` with the flat jsDelivr file listing for the pinned upstream release. The command exits unsuccessfully for unsupported Han characters or malformed pack files.

For additions, include the ordered brush outlines and corresponding median paths, retain source and licence notices, add the character to the catalogue, then run the coverage check and preview the animation. For replacements of shipped artwork, give the pack a new version so the deployment and cache keys align. [Artwork provenance](../../public/strokes/cantonese-v1/NOTICE.txt)
