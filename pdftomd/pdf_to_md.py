#!/usr/bin/env python3
"""Minimal DocuFlow-compatible PDF → Markdown converter.

Supports the CLI flags used by server/pdf-server.mjs:
  input -o output.md --force --progress-format jsonl
  --ocr-profile --ocr-accuracy [--ocr/--ocr-fallback --ocr-engine]
  --split-every N
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import traceback
from pathlib import Path


def emit_progress(percent: float, stage: str, message: str) -> None:
    payload = {
        "percent": max(0, min(100, float(percent))),
        "stage": stage,
        "message": message,
        "progress": max(0, min(100, float(percent))),
    }
    print(json.dumps(payload, ensure_ascii=False), file=sys.stderr, flush=True)


def warn(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def normalize_page_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_with_pypdf(pdf_path: Path) -> list[str]:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    pages: list[str] = []
    for page in reader.pages:
        try:
            raw = page.extract_text() or ""
        except Exception:
            raw = ""
        pages.append(normalize_page_text(raw))
    return pages


def extract_with_pdfplumber(pdf_path: Path) -> list[str]:
    import pdfplumber

    pages: list[str] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            try:
                raw = page.extract_text() or ""
            except Exception:
                raw = ""
            pages.append(normalize_page_text(raw))
    return pages


def extract_with_pdfminer(pdf_path: Path) -> list[str]:
    from pdfminer.high_level import extract_text

    raw = extract_text(str(pdf_path)) or ""
    parts = [normalize_page_text(part) for part in raw.split("\f")]
    return [part for part in parts if part] or [normalize_page_text(raw)]


def merge_page_candidates(primary: list[str], secondary: list[str]) -> list[str]:
    count = max(len(primary), len(secondary))
    merged: list[str] = []
    weak_before = 0
    weak_after = 0
    for index in range(count):
        a = primary[index] if index < len(primary) else ""
        b = secondary[index] if index < len(secondary) else ""
        if len(a.strip()) < 20:
            weak_before += 1
        chosen = a if len(a) >= len(b) else b
        if len(chosen.strip()) < 20:
            weak_after += 1
        merged.append(chosen)
    warn(f"diagnostics weak_pages_before_pdfplumber={weak_before}")
    warn(f"diagnostics weak_pages_after_pdfplumber={weak_after}")
    return merged


def extract_with_pdf_inspector(pdf_path: Path) -> tuple[list[str], dict[str, object]]:
    """Layout-aware Markdown extraction via firecrawl/pdf-inspector (no OCR).

    Returns per-page Markdown plus classification metadata. Raises when the
    optional pdf_inspector dependency is unavailable so callers can fall back.
    """
    import pdf_inspector

    detection = pdf_inspector.detect_pdf(str(pdf_path))
    pages_result = pdf_inspector.extract_pages_markdown(str(pdf_path))
    pages = [normalize_page_text(page.markdown or "") for page in pages_result.pages]
    meta = {
        "pdf_type": str(getattr(detection, "pdf_type", "unknown")),
        "confidence": float(getattr(detection, "confidence", 0.0) or 0.0),
        "pages_needing_ocr": [int(page) for page in (getattr(detection, "pages_needing_ocr", None) or [])],
        "has_encoding_issues": bool(getattr(detection, "has_encoding_issues", False)),
        "pages_with_tables": [int(page) for page in (getattr(detection, "pages_with_tables", None) or [])],
        "is_complex_layout": bool(getattr(detection, "is_complex_layout", False)),
    }
    return pages, meta


def extract_legacy_pages(pdf_path: Path) -> list[str]:
    """pypdf + pdfplumber/page text extraction with per-page merging."""
    emit_progress(15, "extract", "Extracting text with pypdf")
    primary = extract_with_pypdf(pdf_path)
    warn(f"diagnostics estimated_pages={len(primary)}")

    emit_progress(40, "layout", "Refining layout with pdfplumber")
    try:
        secondary = extract_with_pdfplumber(pdf_path)
    except Exception as error:
        warn(f"warning pdfplumber failed: {error}")
        try:
            secondary = extract_with_pdfminer(pdf_path)
        except Exception as miner_error:
            warn(f"warning pdfminer failed: {miner_error}")
            secondary = primary
    return merge_page_candidates(primary, secondary)


def page_to_markdown(page_text: str, page_number: int) -> str:
    if not page_text.strip():
        body = "_No extractable text on this page._"
    else:
        body = page_text.strip()
    return f"## Page {page_number}\n\n{body}\n"


def write_outputs(pages: list[str], output_path: Path, split_every: int | None) -> list[Path]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not pages:
        pages = [""]

    if split_every and split_every > 0:
        written: list[Path] = []
        total = len(pages)
        start = 0
        while start < total:
            end = min(total, start + split_every)
            chunk_pages = pages[start:end]
            chunk_name = f"{output_path.stem}_pages_{start + 1}-{end}{output_path.suffix}"
            chunk_path = output_path.with_name(chunk_name)
            content = "\n".join(
                page_to_markdown(text, start + offset + 1)
                for offset, text in enumerate(chunk_pages)
            )
            chunk_path.write_text(content.strip() + "\n", encoding="utf-8")
            written.append(chunk_path)
            start = end
        return written

    content = "\n".join(page_to_markdown(text, index + 1) for index, text in enumerate(pages))
    output_path.write_text(content.strip() + "\n", encoding="utf-8")
    return [output_path]


def maybe_ocr_pages(
    pdf_path: Path,
    pages: list[str],
    ocr_mode: str | None,
    ocr_engine: str | None,
    ocr_accuracy: str,
) -> list[str]:
    if not ocr_mode or ocr_mode == "none":
        return pages

    # Best-effort OCR only when extractable text is weak and tesseract stack exists.
    weak_indexes = [i for i, text in enumerate(pages) if len(text.strip()) < 20]
    if ocr_mode == "auto" and not weak_indexes:
        return pages

    try:
        import shutil
        import subprocess
        import tempfile
    except Exception:
        return pages

    if shutil.which("pdftoppm") is None or shutil.which("tesseract") is None:
        warn("warning ocr skipped: pdftoppm/tesseract unavailable")
        return pages

    target_indexes = weak_indexes if ocr_mode in {"auto", "fallback"} else list(range(len(pages)))
    if not target_indexes:
        return pages

    lang = "kor+eng"
    dpi = "200" if ocr_accuracy in {"accurate", "max"} else "150"
    warn(
        f"diagnostics mode=ocr_renderer renderer=pdftoppm dpi_candidates={dpi} accuracy={ocr_accuracy}"
    )
    warn(
        f"diagnostics requested_engine={ocr_engine or 'tesseract'} ocr_pages_requested={len(target_indexes)} ocr_pages_applied=0"
    )

    updated = list(pages)
    applied = 0
    with tempfile.TemporaryDirectory(prefix="pdftomd-ocr-") as tmp:
        tmp_path = Path(tmp)
        prefix = tmp_path / "page"
        try:
            subprocess.run(
                ["pdftoppm", "-png", "-r", dpi, str(pdf_path), str(prefix)],
                check=True,
                capture_output=True,
                text=True,
            )
        except Exception as error:
            warn(f"warning ocr rasterize failed: {error}")
            return pages

        images = sorted(tmp_path.glob("page-*.png"))
        for index in target_indexes:
            if index >= len(images):
                continue
            image = images[index]
            try:
                result = subprocess.run(
                    ["tesseract", str(image), "stdout", "-l", lang, "--psm", "6"],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                text = normalize_page_text(result.stdout)
                if text:
                    updated[index] = text
                    applied += 1
            except Exception as error:
                warn(f"warning ocr page {index + 1} failed: {error}")

    warn(
        f"diagnostics requested_engine={ocr_engine or 'tesseract'} ocr_pages_requested={len(target_indexes)} ocr_pages_applied={applied}"
    )
    return updated


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="DocuFlow pdftomd-compatible converter")
    parser.add_argument("input", type=Path, help="Input PDF path")
    parser.add_argument("-o", "--output", type=Path, required=True, help="Output markdown path")
    parser.add_argument("--force", action="store_true", help="Overwrite output if present")
    parser.add_argument("--progress-format", choices=["jsonl", "none"], default="jsonl")
    parser.add_argument("--ocr-profile", default="none")
    parser.add_argument("--ocr-accuracy", default="balanced")
    parser.add_argument("--ocr", nargs="?", const="auto", default=None)
    parser.add_argument("--ocr-fallback", action="store_true")
    parser.add_argument("--ocr-engine", default="none")
    parser.add_argument("--split-every", type=int, default=0)
    parser.add_argument(
        "--extractor",
        choices=["auto", "pdf-inspector", "legacy"],
        default="auto",
        help="Extraction engine: pdf-inspector (layout-aware Markdown, no OCR), legacy (pypdf/pdfplumber), or auto",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    input_path: Path = args.input
    output_path: Path = args.output

    if not input_path.exists():
        print(f"Input PDF not found: {input_path}", file=sys.stderr)
        return 2

    if output_path.exists() and not args.force:
        print(f"Output exists: {output_path} (pass --force)", file=sys.stderr)
        return 2

    try:
        emit_progress(1, "start", "Starting PDF text extraction")
        warn(f"diagnostics estimated_pages=unknown ocr_profile={args.ocr_profile}")

        pages: list[str] | None = None
        if args.extractor in {"auto", "pdf-inspector"}:
            emit_progress(15, "extract", "Extracting layout-aware Markdown with pdf-inspector (no OCR)")
            try:
                pages, inspector_meta = extract_with_pdf_inspector(input_path)
                warn(
                    "diagnostics "
                    f"engine=pdf_inspector pdf_type={inspector_meta['pdf_type']} "
                    f"confidence={inspector_meta['confidence']} "
                    f"pages_needing_ocr={inspector_meta['pages_needing_ocr']} "
                    f"has_encoding_issues={str(inspector_meta['has_encoding_issues']).lower()} "
                    f"pages_with_tables={inspector_meta['pages_with_tables']}"
                )
                warn(f"diagnostics estimated_pages={len(pages)}")
            except Exception as error:
                warn(f"warning pdf_inspector failed, falling back to legacy: {error}")
                pages = None

        if pages is None:
            pages = extract_legacy_pages(input_path)
        else:
            # Fill pages pdf-inspector left empty from the legacy extractors so
            # image-only pages can still be OCR'd downstream when requested.
            empty_indexes = [index for index, text in enumerate(pages) if not (text or "").strip()]
            if empty_indexes:
                warn(f"diagnostics pdf_inspector_empty_pages={empty_indexes}")
                try:
                    legacy_pages = extract_legacy_pages(input_path)
                    filled = 0
                    for index in empty_indexes:
                        if (
                            index < len(legacy_pages)
                            and (legacy_pages[index] or "").strip()
                            and not (pages[index] or "").strip()
                        ):
                            pages[index] = legacy_pages[index]
                            filled += 1
                    warn(f"diagnostics pdf_inspector_pages_filled_from_legacy={filled}")
                except Exception as error:
                    warn(f"warning legacy fallback for empty pages failed: {error}")

        ocr_mode = None
        if args.ocr_fallback:
            ocr_mode = "fallback"
        elif args.ocr:
            ocr_mode = args.ocr

        if ocr_mode:
            emit_progress(65, "ocr", f"Running OCR mode={ocr_mode}")
            pages = maybe_ocr_pages(
                input_path,
                pages,
                ocr_mode=ocr_mode,
                ocr_engine=args.ocr_engine,
                ocr_accuracy=args.ocr_accuracy,
            )

        emit_progress(90, "write", "Writing markdown output")
        split_every = args.split_every if args.split_every and args.split_every > 0 else None
        written = write_outputs(pages, output_path, split_every)

        report_dir = Path.cwd() / "report"
        report_dir.mkdir(parents=True, exist_ok=True)
        (report_dir / "perf_last_run.md").write_text(
            "\n".join(
                [
                    "# pdftomd run",
                    f"- input: `{input_path}`",
                    f"- pages: {len(pages)}",
                    f"- outputs: {', '.join(path.name for path in written)}",
                    f"- ocr_profile: {args.ocr_profile}",
                    f"- ocr_accuracy: {args.ocr_accuracy}",
                ]
            )
            + "\n",
            encoding="utf-8",
        )

        emit_progress(100, "done", f"Wrote {len(written)} markdown file(s)")
        return 0
    except Exception as error:
        traceback.print_exc()
        print(f"pdftomd failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
