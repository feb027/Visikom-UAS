<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.agents/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->

## Aturan Kerja dan Dokumentasi Proyek UAS Visi Komputer

1. Untuk seluruh penulisan dokumen riset, log progres, laporan proyek, dan teks antarmuka berbahasa Indonesia, baca dan patuhi `.agents/skills/visikom-anti-ai-writing/SKILL.md` bersama `antislop` core dan `antislop-copywriting`.
2. Setiap kemajuan riset, keputusan rancangan antarmuka (`DESIGN.md`), audit dataset, eksperimen pelatihan, maupun integrasi aplikasi wajib dicatat secara kronologis pada [docs/PROGRESS.md](docs/PROGRESS.md).
3. Setiap klaim literatur, statistik dataset, atau perbandingan performa metode wajib mengacu sumber terverifikasi di [docs/research/source-ledger.md](docs/research/source-ledger.md) (`[S###]`) dan [references/references.bib](references/references.bib) (`[@bibkey]`). Klaim eksperimen internal yang belum dieksekusi wajib memakai penanda `[DATA EKSPERIMEN: ...]`.
4. Sebelum membangun kode antarmuka aplikasi (baik Streamlit maupun web), tetapkan arah visual dan tiga dial (`ENERGY`, `RHYTHM`, `MOTION`) pada `DESIGN.md` sesuai aturan `R-37` pada `antislop`.
5. Jalankan `python scripts/validate_docs.py` (wajib keluar dengan kode `0`) setiap kali memperbarui berkas dokumentasi atau bibliografi.
