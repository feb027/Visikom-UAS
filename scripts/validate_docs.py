"""Validator dokumentasi proyek UAS Visi Komputer dan Robotika.

Memeriksa seluruh berkas Markdown aktif terhadap:
1. Keberadaan karakter em dash (U+2014) atau pemisah kalimat ' -- '.
2. Kata atau frasa terlarang pada daftar AI slop & ejaan tidak baku EYD V.
3. Konsistensi rujukan sumber [S###] terhadap docs/research/source-ledger.md
   serta sitasi [@bibkey] terhadap references/references.bib.
4. Keutuhan seluruh tautan berkas lokal di dalam dokumen Markdown.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
LEDGER_PATH = ROOT / "docs" / "research" / "source-ledger.md"
BIB_PATH = ROOT / "references" / "references.bib"

TARGET_FILES: list[Path] = [
    ROOT / "README.md",
    ROOT / "AGENTS.md",
    ROOT / "DESIGN.md",
]
TARGET_DIRS: list[Path] = [
    ROOT / "docs",
    ROOT / ".agents" / "skills" / "visikom-anti-ai-writing",
]

SLOP_PATTERNS: list[tuple[str, str]] = [
    (r"\bdi\s+mana\b", "Hindari terjemahan cacat 'di mana' (gunakan 'dengan'/'yang')"),
    (r"\byang\s+mana\b", "Hindari terjemahan cacat 'yang mana'"),
    (r"\banalisa\b", "Gunakan ejaan baku EYD V: 'analisis'"),
    (r"\bpraktek\b", "Gunakan ejaan baku EYD V: 'praktik'"),
    (r"\bresiko\b", "Gunakan ejaan baku EYD V: 'risiko'"),
    (r"\bsistim\b", "Gunakan ejaan baku EYD V: 'sistem'"),
    (r"\baktifitas\b", "Gunakan ejaan baku EYD V: 'aktivitas'"),
    (r"\bstandarisasi\b", "Gunakan ejaan baku EYD V: 'standardisasi'"),
    (r"\bdi\s+(?:latih|uji|unggah|ekspor|tampilkan|evaluasi|bagi|simpan|ambil)\b", "Awalan pasif 'di-' ditulis serangkai"),
    (r"\bkrusial\b", "Hindari penggelembung klaim 'krusial'"),
    (r"\brevolusioner\b", "Hindari penggelembung klaim 'revolusioner'"),
    (r"\bkomprehensif\b", "Hindari kata kabur 'komprehensif'; rincikan cakupannya"),
    (r"\b(?:di\s+era\s+digital|seiring\s+pesatnya\s+perkembangan|tidak\s+dapat\s+dipungkiri)\b", "Hindari pembuka klise LLM"),
]


def collect_markdown_files() -> list[Path]:
    files: list[Path] = [p for p in TARGET_FILES if p.exists()]
    for directory in TARGET_DIRS:
        if directory.exists():
            files.extend(sorted(directory.rglob("*.md")))
    return files


def strip_antislop_block(text: str, path: Path) -> str:
    if path.name == "AGENTS.md":
        return re.sub(
            r"<!--\s*antislop:start\s*-->.*?<!--\s*antislop:end\s*-->",
            "",
            text,
            flags=re.DOTALL,
        )
    return text


def strip_code_blocks(text: str) -> str:
    return re.sub(r"```.*?```", "", text, flags=re.DOTALL)


def load_ledger_ids() -> set[str]:
    if not LEDGER_PATH.exists():
        return set()
    content = LEDGER_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"`(S\d{3})`", content))


def load_bib_keys() -> set[str]:
    if not BIB_PATH.exists():
        return set()
    content = BIB_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"@\w+\{\s*([^,\s]+)\s*,", content))


def check_file(path: Path, ledger_ids: set[str], bib_keys: set[str]) -> list[str]:
    errors: list[str] = []
    rel = path.relative_to(ROOT).as_posix()
    raw = path.read_text(encoding="utf-8")
    cleaned = strip_code_blocks(strip_antislop_block(raw, path))

    is_banlist_ref = path.name == "banlist-dan-pengganti-id.md"
    is_skill_doc = "visikom-anti-ai-writing" in path.parts

    for lineno, line in enumerate(cleaned.splitlines(), start=1):
        if "\u2014" in line:
            errors.append(f"{rel}:{lineno}: ditemukan karakter em dash (U+2014)")
        if " -- " in line:
            errors.append(f"{rel}:{lineno}: ditemukan pemisah kalimat ' -- '")

        if not is_banlist_ref and not is_skill_doc:
            for pattern, message in SLOP_PATTERNS:
                if re.search(pattern, line, flags=re.IGNORECASE):
                    errors.append(f"{rel}:{lineno}: {message}")

    # Validasi rujukan [S###] atau [S001, S002] pada folder docs/ dan DESIGN.md
    if "docs" in path.parts or path.name == "DESIGN.md":
        for group in re.findall(r"\[(S\d{3}(?:\s*,\s*S\d{3})*)\]", cleaned):
            for sid in re.findall(r"S\d{3}", group):
                if sid not in ledger_ids:
                    errors.append(f"{rel}: rujukan [{sid}] tidak ditemukan di source-ledger.md")

        for bkey in re.findall(r"@([a-zA-Z0-9_:-]+)", cleaned):
            # Abaikan contoh sintaksis umum [@bibkey]
            if bkey in {"bibkey", "bibkey1", "bibkey2"}:
                continue
            # Hanya periksa bila muncul dalam format sitasi Pandoc [@...]
            if re.search(rf"\[[^\]]*@{re.escape(bkey)}[^\]]*\]", cleaned) and bkey not in bib_keys:
                errors.append(f"{rel}: kunci sitasi [@{bkey}] tidak ada di references.bib")

    # Validasi tautan Markdown lokal
    for target in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", cleaned):
        target = target.strip()
        if not target or target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        if target.startswith("file:///"):
            local_str = unquote(target[len("file:///"):])
            local_path = Path(local_str)
            if not local_path.exists():
                errors.append(f"{rel}: tautan file:// tidak ditemukan -> {target}")
            continue

        path_part = target.split("#", 1)[0]
        if not path_part:
            continue
        resolved = (path.parent / path_part).resolve()
        if not resolved.exists():
            errors.append(f"{rel}: tautan relatif tidak ditemukan -> {target}")

    return errors


def main() -> int:
    ledger_ids = load_ledger_ids()
    bib_keys = load_bib_keys()
    files = collect_markdown_files()

    all_errors: list[str] = []
    if not ledger_ids:
        all_errors.append("docs/research/source-ledger.md kosong atau tidak ditemukan.")
    if not bib_keys:
        all_errors.append("references/references.bib kosong atau tidak ditemukan.")

    for md_file in files:
        all_errors.extend(check_file(md_file, ledger_ids, bib_keys))

    print(f"File diperiksa: {len(files)} | Sumber ledger: {len(ledger_ids)} | Entri BibTeX: {len(bib_keys)}")
    if all_errors:
        print("STATUS: FAIL")
        for err in all_errors:
            print(f" - {err}")
        return 1

    print("STATUS: PASS (0 galat anti-slop, sitasi, dan tautan)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
