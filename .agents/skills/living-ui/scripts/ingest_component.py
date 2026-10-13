#!/usr/bin/env python3
"""
ingest_component.py — Ingests a vetted/de-slopped component into Living UI.

Saves the component code into resources/components/<category>/<slug>.<ext>
and registers or updates its row in references/catalog.md.
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = SKILL_ROOT / "references" / "catalog.md"
COMPONENTS_DIR = SKILL_ROOT / "resources" / "components"


def parse_args():
    parser = argparse.ArgumentParser(description="Ingest a UI component into Living UI skill.")
    parser.add_argument("--name", required=True, help="Display name of the component (e.g. 'Floating Dock')")
    parser.add_argument("--category", required=True, help="Category folder (e.g. 'navigation', 'data-display', 'feedback', 'inputs', 'cards', 'marketing')")
    parser.add_argument("--slug", required=True, help="File slug (e.g. 'floating-dock')")
    parser.add_argument("--origin", default="21st.dev", help="Source ID or origin URL")
    parser.add_argument("--deps", default="none", help="Comma-separated external dependencies (e.g. 'lucide-react,framer-motion')")
    parser.add_argument("--desc", required=True, help="Brief functional description of the component")
    parser.add_argument("--file", required=True, help="Path to the cleaned source file to ingest")
    return parser.parse_args()


def main():
    args = parse_args()
    source_file = Path(args.file)
    if not source_file.exists():
        print(f"Error: Source file '{source_file}' does not exist.", file=sys.stderr)
        sys.exit(1)

    ext = source_file.suffix or ".tsx"
    dest_dir = COMPONENTS_DIR / args.category
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / f"{args.slug}{ext}"

    # Copy the file into the skill resources if not already there
    if source_file.resolve() != dest_file.resolve():
        shutil.copy2(source_file, dest_file)
    rel_path = dest_file.relative_to(SKILL_ROOT)
    print(f"✓ Saved component code to: {dest_file}")

    # Update references/catalog.md
    if not CATALOG_PATH.exists():
        print(f"Error: Catalog file '{CATALOG_PATH}' not found.", file=sys.stderr)
        sys.exit(1)

    catalog_text = CATALOG_PATH.read_text(encoding="utf-8")
    table_row = f"| {args.name} | `{args.category}` | `{rel_path}` | {args.deps} | {args.origin} | {args.desc} |\n"

    # Check if entry already exists (by name or slug)
    if f"`{rel_path}`" in catalog_text:
        # Update existing line
        lines = catalog_text.splitlines(keepends=True)
        new_lines = []
        for line in lines:
            if f"`{rel_path}`" in line:
                new_lines.append(table_row)
            else:
                new_lines.append(line)
        CATALOG_PATH.write_text("".join(new_lines), encoding="utf-8")
        print(f"✓ Updated existing catalog record in: {CATALOG_PATH}")
    else:
        # Append after the table header / last table row
        lines = catalog_text.splitlines(keepends=True)
        inserted = False
        new_lines = []
        for line in lines:
            new_lines.append(line)
            if line.strip().startswith("|") and ("---" in line or "Template Entry" in line) and not inserted:
                new_lines.append(table_row)
                inserted = True

        if not inserted:
            new_lines.append(table_row)

        CATALOG_PATH.write_text("".join(new_lines), encoding="utf-8")
        print(f"✓ Added new entry to catalog: {CATALOG_PATH}")

    print("\nComponent successfully ingested into Living UI skill!")


if __name__ == "__main__":
    main()
