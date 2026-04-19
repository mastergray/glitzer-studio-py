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


def _extract_vf(code_block: str) -> str | None:
    """Extract the -vf "..." filter chain from an ffmpeg command."""
    # Match -vf "..." or -vf '...'
    m = re.search(r'-vf\s+["\'](.+?)["\']', code_block, re.DOTALL)
    if m:
        # Clean up multi-line filter chains (join continuation lines)
        chain = m.group(1)
        chain = re.sub(r'\s*\\\s*\n\s*', '', chain)
        return chain.strip()

    # Also try -filter_complex "..."
    m = re.search(r'-filter_complex\s+["\'](.+?)["\']', code_block, re.DOTALL)
    if m:
        chain = m.group(1)
        chain = re.sub(r'\s*\\\s*\n\s*', '', chain)
        return chain.strip()

    return None


def parse_recipe_file(path: str) -> dict[str, dict]:
    """Parse a single markdown recipe file.

    Returns dict of slug → {name, filter_chain, source_file}.
    """
    recipes = {}
    text = Path(path).read_text()
    source = os.path.basename(path)

    # Split on ## headers
    sections = re.split(r'^## ', text, flags=re.MULTILINE)

    for section in sections[1:]:  # skip preamble before first ##
        lines = section.strip().split('\n')
        if not lines:
            continue

        name = lines[0].strip()
        slug = _slugify(name)
        if not slug:
            continue

        # Find code blocks
        code_blocks = re.findall(r'```(?:bash)?\s*\n(.+?)```', section, re.DOTALL)

        for block in code_blocks:
            chain = _extract_vf(block)
            if chain:
                recipes[slug] = {
                    'name': name,
                    'filter_chain': chain,
                    'source_file': source,
                }
                break  # take first matching code block per recipe

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
