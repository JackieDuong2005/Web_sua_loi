#!/usr/bin/env python3
"""
scan_project.py — Quick, deterministic reconnaissance of a codebase.

Usage:
    python3 scan_project.py <project_root> [--max-depth N] [--max-list 400]

Prints a structured report (JSON) with:
  - directory tree (depth-limited, noise-filtered)
  - manifest / marker files found (package.json, pyproject.toml, go.mod, ...)
  - likely entry points
  - file counts by extension
  - largest source files (by line count) — good "read next" candidates
  - obvious config/env/CI files

This script never modifies anything. It only reads file names, sizes, and
line counts — it does NOT dump full file contents (that's the agent's job,
selectively, after seeing this report).
"""
import argparse
import json
import os
import sys

# Directories that are almost always noise for "understanding the project"
IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", "out", "target", ".next", ".nuxt", ".turbo",
    ".cache", ".pytest_cache", ".mypy_cache", "coverage", ".idea",
    ".vscode", "vendor", ".gradle", ".terraform", "site-packages",
    "eggs", ".eggs", "*.egg-info", ".tox", "bower_components",
}

MANIFEST_FILES = {
    "package.json": "Node/JS",
    "pyproject.toml": "Python",
    "requirements.txt": "Python",
    "setup.py": "Python",
    "Pipfile": "Python",
    "go.mod": "Go",
    "Cargo.toml": "Rust",
    "pom.xml": "Java (Maven)",
    "build.gradle": "Java/Kotlin (Gradle)",
    "build.gradle.kts": "Java/Kotlin (Gradle)",
    "composer.json": "PHP",
    "Gemfile": "Ruby",
    "mix.exs": "Elixir",
    "pubspec.yaml": "Dart/Flutter",
    "CMakeLists.txt": "C/C++",
    "*.csproj": "C#/.NET",
    "*.sln": "C#/.NET",
}

CONFIG_HINTS = {
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".env", ".env.example", ".env.sample",
    "Makefile", "Procfile",
    ".github", ".gitlab-ci.yml", ".circleci",
    "tsconfig.json", "webpack.config.js", "vite.config.ts", "vite.config.js",
    "next.config.js", "next.config.ts", "nuxt.config.ts",
    "tailwind.config.js", "jest.config.js", "pytest.ini", "tox.ini",
    "alembic.ini", "manage.py", "wsgi.py", "asgi.py",
    ".eslintrc", ".eslintrc.json", ".prettierrc",
    "docker-compose.override.yml", "serverless.yml", "terraform",
}

ENTRY_POINT_NAMES = {
    "main.py", "app.py", "manage.py", "wsgi.py", "asgi.py",
    "index.js", "index.ts", "main.js", "main.ts", "server.js", "server.ts",
    "app.js", "app.ts", "main.go", "Main.java", "Program.cs",
    "main.rs", "index.html", "App.jsx", "App.tsx", "main.dart",
}

README_NAMES = {"readme.md", "readme.rst", "readme.txt", "readme"}

SOURCE_EXTS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".kt",
    ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".hpp", ".swift", ".dart",
    ".vue", ".svelte", ".scala", ".ex", ".exs",
}


def should_ignore_dir(name):
    return name in IGNORE_DIRS or name.startswith(".") and name not in {".github"}


def count_lines(path, cap=20000):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def build_tree(root, max_depth):
    tree_lines = []

    def walk(current, depth, prefix=""):
        if depth > max_depth:
            return
        try:
            entries = sorted(os.listdir(current))
        except PermissionError:
            return
        dirs = [e for e in entries if os.path.isdir(os.path.join(current, e)) and not should_ignore_dir(e)]
        files = [e for e in entries if os.path.isfile(os.path.join(current, e))]
        for d in dirs:
            tree_lines.append(f"{prefix}{d}/")
            walk(os.path.join(current, d), depth + 1, prefix + "  ")
        if depth == max_depth and dirs:
            tree_lines.append(f"{prefix}  ... (more nested dirs not expanded)")
        for f in files[:50]:
            tree_lines.append(f"{prefix}{f}")
        if len(files) > 50:
            tree_lines.append(f"{prefix}... (+{len(files)-50} more files)")

    walk(root, 0)
    return tree_lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project_root")
    ap.add_argument("--max-depth", type=int, default=3)
    ap.add_argument("--max-list", type=int, default=400)
    args = ap.parse_args()

    root = os.path.abspath(args.project_root)
    if not os.path.isdir(root):
        print(json.dumps({"error": f"Not a directory: {root}"}))
        sys.exit(1)

    manifests_found = []
    config_found = []
    entry_points = []
    readmes = []
    ext_counts = {}
    all_source_files = []
    total_files = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not should_ignore_dir(d)]
        rel_dir = os.path.relpath(dirpath, root)

        for fname in filenames:
            total_files += 1
            fpath = os.path.join(dirpath, fname)
            rel_path = os.path.normpath(os.path.join(rel_dir, fname)) if rel_dir != "." else fname

            if fname in MANIFEST_FILES:
                manifests_found.append({"path": rel_path, "stack": MANIFEST_FILES[fname]})
            if fname in CONFIG_HINTS:
                config_found.append(rel_path)
            if fname in ENTRY_POINT_NAMES:
                entry_points.append(rel_path)
            if fname.lower() in README_NAMES:
                readmes.append(rel_path)

            ext = os.path.splitext(fname)[1].lower()
            if ext:
                ext_counts[ext] = ext_counts.get(ext, 0) + 1

            if ext in SOURCE_EXTS:
                # depth-limit line counting to avoid huge scans on giant repos
                if len(all_source_files) < 3000:
                    lines = count_lines(fpath)
                    all_source_files.append({"path": rel_path, "lines": lines, "ext": ext})

    all_source_files.sort(key=lambda x: x["lines"], reverse=True)
    top_largest = all_source_files[:25]

    ext_counts_sorted = dict(sorted(ext_counts.items(), key=lambda x: x[1], reverse=True)[:20])

    tree = build_tree(root, args.max_depth)

    report = {
        "project_root": root,
        "total_files_scanned": total_files,
        "readmes": readmes,
        "manifests_found": manifests_found,
        "config_files_found": sorted(set(config_found)),
        "likely_entry_points": sorted(set(entry_points)),
        "file_extension_counts": ext_counts_sorted,
        "largest_source_files": top_largest,
        "directory_tree_depth_limited": tree[:args.max_list],
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
