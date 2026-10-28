import sys
from pathlib import Path

# Otomatis deteksi dan tambahkan .venv site-packages jika dijalankan langsung lewat global python
_venv_lib = Path(__file__).resolve().parent.parent / ".venv" / "Lib" / "site-packages"
if _venv_lib.exists() and str(_venv_lib) not in sys.path:
    sys.path.insert(0, str(_venv_lib))

