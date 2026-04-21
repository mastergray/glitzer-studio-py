"""Parse ffmpeg filter recipes from markdown files.

Scans a directory of ffmpeg recipe markdown files, extracts the filter
chains from code blocks, and builds a name→filter_chain registry.

Each recipe has a `## N. Name` header followed by a code block containing
an ffmpeg command with -vf "...". The parser extracts the filter chain
and generates a slug from the recipe name.
"""
from __future__ import annotations
import os
import re
from pathlib import Path


def _slugify(name: str) -> str:
    """Convert recipe name to a slug: lowercase, spaces→underscores, strip numbers."""
    # Remove leading "N. " prefix
    name = re.sub(r'^\d+\.\s*', '', name)
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '_', slug)
    slug = slug.strip('_')
    return slug


def _extract_vf(code_block: str) -> tuple[str | None, str | None]:
    """Extract the -vf/-filter_complex chain and output filename from an ffmpeg command.

    Returns (filter_chain, output_slug) where output_slug is derived from the
    output filename (e.g. 'output_radar.mp4' → 'radar').
    """
    # First join backslash-continuation lines so the filter is one line.
    block = re.sub(r'\s*\\\s*\n\s*', ' ', code_block)

    # Extract output filename slug (output_NAME.mp4 → NAME).
    out_match = re.search(r'output_([a-z0-9_]+)\.mp4', block)
    out_slug = out_match.group(1) if out_match else None

    # Match -vf "..." using greedy match within double quotes.
    # Double-quote delimited (may contain single quotes for expressions).
    m = re.search(r'-vf\s+"([^"]+)"', block)
    if m:
        return m.group(1).strip(), out_slug

    # Try single-quote delimited.
    m = re.search(r"-vf\s+'([^']+)'", block)
    if m:
        return m.group(1).strip(), out_slug

    # Try -filter_complex "..."
    m = re.search(r'-filter_complex\s+"([^"]+)"', block)
    if m:
        return m.group(1).strip(), out_slug

    m = re.search(r"-filter_complex\s+'([^']+)'", block)
    if m:
        return m.group(1).strip(), out_slug

    return None, out_slug


def parse_recipe_file(path: str) -> dict[str, dict]:
    """Parse a single markdown recipe file.

    Returns dict of slug → {name, filter_chain, source_file}.
    Extracts ALL code blocks per section — each variant gets its own entry
    keyed by the output filename slug (e.g. output_radar.mp4 → 'radar').
    Falls back to the section header slug when no output filename is present.
    """
    recipes = {}
    text = Path(path).read_text()
    source = os.path.basename(path)
    # Derive category prefix from filename (e.g. ffmpeg-decay-effects.md → decay_effects)
    cat = os.path.splitext(source)[0]  # ffmpeg-decay-effects
    cat = cat.replace('ffmpeg-', '')     # decay-effects
    cat = cat.replace('-', '_')          # decay_effects

    # Split on ## headers
    sections = re.split(r'^## ', text, flags=re.MULTILINE)

    for section in sections[1:]:  # skip preamble before first ##
        lines = section.strip().split('\n')
        if not lines:
            continue

        raw_name = lines[0].strip()
        # Strip leading "N. " numbering from section headers.
        name = re.sub(r'^\d+\.\s*', '', raw_name)
        header_slug = _slugify(raw_name)
        if not header_slug:
            continue

        # Find code blocks
        code_blocks = re.findall(r'```(?:bash)?\s*\n(.+?)```', section, re.DOTALL)

        found_any = False
        for block in code_blocks:
            chain, out_slug = _extract_vf(block)
            if chain:
                # Prefer output filename as slug, fall back to header.
                slug = out_slug if out_slug else header_slug
                recipes[slug] = {
                    'name': name,
                    'filter_chain': chain,
                }
                found_any = True

    return recipes


def load_all_filters(directory: str) -> dict[str, dict]:
    """Parse all ffmpeg-*.md files in a directory.

    Returns combined registry: slug → {name, filter_chain, source_file}.
    """
    registry = {}
    dirpath = Path(directory)
    if not dirpath.is_dir():
        raise SystemExit(f'ffmpeg filters directory not found: {directory}')

    for md in sorted(dirpath.glob('ffmpeg-*.md')):
        recipes = parse_recipe_file(str(md))
        registry.update(recipes)

    return registry


def list_filters(registry: dict[str, dict]) -> str:
    """Format the registry as a readable list."""
    lines = []
    for slug in sorted(registry):
        r = registry[slug]
        chain_preview = r['filter_chain'][:60] + '...' if len(r['filter_chain']) > 60 else r['filter_chain']
        lines.append(f'  {slug:40s} {chain_preview}')
    return '\n'.join(lines)
