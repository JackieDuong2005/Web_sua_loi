#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
scan_project.py — Fast, deterministic reconnaissance for ViHand Grade & general projects.

Usage:
    python scan_project.py <project_root> [--max-depth N] [--max-list 400]

Features:
  - Blazing fast (<0.1s): parses .gitignore and excludes heavy/noise subdirectories.
  - Detects ViHand Grade tech stack (Next.js 16, React 19, Tailwind CSS 4, Prisma SQLite,
    FastAPI ViT5, Jimp pipeline, FastMCP service).
  - Highlights core entry points and largest source files without noise.
  - Safe UTF-8 handling on Windows PowerShell / console.
"""
import argparse
import json
import os
import sys

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Directories that are noise or independent subprojects
DEFAULT_IGNORES = {
    # Generic dev / build noise
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", "out", "target", ".next", ".nuxt", ".turbo",
    ".cache", ".pytest_cache", ".mypy_cache", "coverage", ".idea",
    ".vscode", "vendor", ".gradle", ".terraform", "site-packages",
    "eggs", ".eggs", "*.egg-info", ".tox", "bower_components",
    # ViHand Grade specific heavy/independent directories
    "xiaozhi-esp32-main", "xiaozhi-esp32-server-main",
    "02_Kich_ban_Thuc_nghiem", "Poster nckh", "Font Tieu hoc",
    "He_thong_iots_Do_an_nhung", "android-app", "anhdaduocOCR",
    "scratch", "tmp", "tmp_diagrams", "output",
}

# Project-specific core entry points & anchor files
KNOWN_ANCHORS = {
    "app/api/grade/route.ts": "Core AI Grading API Pipeline (Jimp -> Gemini OCR -> ViT5 -> Scoring)",
    "python_service/main.py": "ViT5 Spelling Correction Server (FastAPI / HuggingFace)",
    "mcp_service/main.py": "Model Context Protocol (MCP) Server for Dictation",
    "lib/image-processor.ts": "9-step Server-side Image Preprocessing Pipeline (Jimp)",
    "prisma/schema.prisma": "Database Schema (SQLite - Users, Classes, Grades, Dictation)",
    "app/teacher/grade/page.tsx": "Teacher Grading UI & Evaluation Canvas",
    "app/teacher/dictation/page.tsx": "AI Dictation & Voice Generation UI",
    "app/admin/users/page.tsx": "User & Role-based Access Control (RBAC) Management",
    "Dockerfile": "Container definition (Node.js + Python runtime)",
    "start_all.bat": "Local startup orchestrator (Next.js + Python ViT5 + MCP)",
}

MANIFEST_FILES = {
    "package.json": "Node/JS",
    "prisma/schema.prisma": "Prisma ORM (Database Schema)",
    "pyproject.toml": "Python",
    "requirements.txt": "Python Dependencies",
    "python_service/requirements.txt": "FastAPI ViT5 Service Dependencies",
    "mcp_service/requirements.txt": "MCP Dictation Service Dependencies",
    "go.mod": "Go",
    "Cargo.toml": "Rust",
    "pom.xml": "Java (Maven)",
    "build.gradle": "Java/Kotlin (Gradle)",
    "Dockerfile": "Docker Container",
    "docker-compose.yml": "Docker Compose",
}

CONFIG_HINTS = {
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".env.example", ".env.local", ".env",
    "tsconfig.json", "next.config.mjs", "next.config.js",
    "tailwind.config.js", "tailwind.config.ts", "postcss.config.mjs",
    "components.json", "prisma.config.ts",
}

GENERIC_ENTRY_POINT_NAMES = {
    "main.py", "app.py", "index.ts", "index.js", "server.ts", "server.js",
    "route.ts", "route.js", "page.tsx", "page.jsx", "App.tsx", "App.jsx",
}

SOURCE_EXTS = {
    ".ts", ".tsx", ".py", ".js", ".jsx", ".mjs", ".css", ".sql", ".prisma",
}


def load_gitignore_rules(root):
    """Load directories and patterns from .gitignore to ignore during walk."""
    ignored = set(DEFAULT_IGNORES)
    gitignore_path = os.path.join(root, ".gitignore")
    if not os.path.exists(gitignore_path):
        return ignored

    try:
        with open(gitignore_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                # Simple directory names like 'folder/' or 'folder'
                cleaned = line.rstrip("/").strip()
                if "/" not in cleaned and "*" not in cleaned:
                    ignored.add(cleaned)
    except Exception:
        pass
    return ignored


def should_ignore(name, ignore_set):
    if name in ignore_set:
        return True
    if name.startswith(".") and name not in {".agents", ".env.example"}:
        return True
    return False


def count_lines(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def detect_detailed_stack(root):
    """Inspect package.json and other files to give an accurate stack summary."""
    stack_info = []

    # Check package.json
    pkg_path = os.path.join(root, "package.json")
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path, "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
                deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                parts = []
                if "next" in deps:
                    parts.append(f"Next.js {deps['next']}")
                if "react" in deps:
                    parts.append(f"React {deps['react']}")
                if "tailwindcss" in deps:
                    parts.append(f"Tailwind CSS {deps['tailwindcss']}")
                if "@prisma/client" in deps or "prisma" in deps:
                    parts.append(f"Prisma ORM {deps.get('prisma', '')}")
                if "@google/genai" in deps or "@google/generative-ai" in deps:
                    parts.append("Google Gemini Vision SDK")
                if "jimp" in deps:
                    parts.append("Jimp (Image Preprocessing)")
                if parts:
                    stack_info.append("Frontend / API: " + ", ".join(parts))
        except Exception:
            pass

    # Check Python ViT5 Service
    py_service = os.path.join(root, "python_service", "main.py")
    if os.path.exists(py_service):
        stack_info.append("AI Service (python_service): FastAPI + ViT5 Seq2Seq Vietnamese Correction")

    # Check MCP Service
    mcp_service = os.path.join(root, "mcp_service", "main.py")
    if os.path.exists(mcp_service):
        stack_info.append("Voice & Dictation (mcp_service): Model Context Protocol (FastMCP) + Edge-TTS")

    # Check Database
    schema_path = os.path.join(root, "prisma", "schema.prisma")
    if os.path.exists(schema_path):
        stack_info.append("Database: SQLite (via Prisma ORM 5.x) storing vihand.db")

    return stack_info


def build_tree(root, max_depth, ignore_set):
    tree_lines = []

    def walk(current, depth, prefix=""):
        if depth > max_depth:
            return
        try:
            entries = sorted(os.listdir(current))
        except (PermissionError, FileNotFoundError):
            return

        dirs = [e for e in entries if os.path.isdir(os.path.join(current, e)) and not should_ignore(e, ignore_set)]
        files = [e for e in entries if os.path.isfile(os.path.join(current, e)) and not e.startswith(".")]

        for d in dirs:
            tree_lines.append(f"{prefix}{d}/")
            walk(os.path.join(current, d), depth + 1, prefix + "  ")
        if depth == max_depth and dirs:
            tree_lines.append(f"{prefix}  ... (nested dirs omitted)")

        for f in files[:35]:
            tree_lines.append(f"{prefix}{f}")
        if len(files) > 35:
            tree_lines.append(f"{prefix}... (+{len(files)-35} more files)")

    walk(root, 0)
    return tree_lines


def main():
    ap = argparse.ArgumentParser(description="Scan project structure cleanly and rapidly.")
    ap.add_argument("project_root", help="Path to project root")
    ap.add_argument("--max-depth", type=int, default=3, help="Max depth for directory tree")
    ap.add_argument("--max-list", type=int, default=400, help="Max tree lines to display")
    args = ap.parse_args()

    root = os.path.abspath(args.project_root)
    if not os.path.isdir(root):
        print(json.dumps({"error": f"Not a directory: {root}"}))
        sys.exit(1)

    ignore_set = load_gitignore_rules(root)

    manifests_found = []
    config_found = []
    likely_entry_points = []
    readmes = []
    ext_counts = {}
    source_files = []
    total_files = 0

    # Scan project files
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignored directories in-place
        dirnames[:] = [d for d in dirnames if not should_ignore(d, ignore_set)]
        rel_dir = os.path.relpath(dirpath, root)

        for fname in filenames:
            total_files += 1
            fpath = os.path.join(dirpath, fname)
            rel_path = os.path.normpath(os.path.join(rel_dir, fname)) if rel_dir != "." else fname
            rel_path_posix = rel_path.replace("\\", "/")

            # Detect manifests
            if fname in MANIFEST_FILES:
                manifests_found.append({"path": rel_path, "stack": MANIFEST_FILES[fname]})
            elif rel_path_posix in MANIFEST_FILES:
                manifests_found.append({"path": rel_path, "stack": MANIFEST_FILES[rel_path_posix]})

            # Detect config
            if fname in CONFIG_HINTS:
                config_found.append(rel_path)

            # Detect known anchors & entry points
            if rel_path_posix in KNOWN_ANCHORS:
                likely_entry_points.append({"path": rel_path, "role": KNOWN_ANCHORS[rel_path_posix]})
            elif fname in GENERIC_ENTRY_POINT_NAMES and rel_dir in {".", "app", "python_service", "mcp_service"}:
                likely_entry_points.append({"path": rel_path, "role": "Candidate entry point"})

            # Detect READMEs
            if fname.lower().startswith("readme") and fname.lower().endswith(".md"):
                readmes.append(rel_path)

            # File extensions & source sizing
            ext = os.path.splitext(fname)[1].lower()
            if ext:
                ext_counts[ext] = ext_counts.get(ext, 0) + 1

            if ext in SOURCE_EXTS and not rel_path_posix.startswith(".next"):
                lines = count_lines(fpath)
                source_files.append({"path": rel_path, "lines": lines, "ext": ext})

    source_files.sort(key=lambda x: x["lines"], reverse=True)
    top_largest = source_files[:20]
    ext_counts_sorted = dict(sorted(ext_counts.items(), key=lambda x: x[1], reverse=True)[:15])

    tree = build_tree(root, args.max_depth, ignore_set)
    tech_stack = detect_detailed_stack(root)

    report = {
        "project_root": root,
        "total_files_scanned": total_files,
        "tech_stack_detected": tech_stack,
        "readmes": readmes,
        "manifests_found": manifests_found,
        "config_files_found": sorted(set(config_found)),
        "core_anchor_points": likely_entry_points,
        "file_extension_counts": ext_counts_sorted,
        "largest_source_files": top_largest,
        "directory_tree_depth_limited": tree[:args.max_list],
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
