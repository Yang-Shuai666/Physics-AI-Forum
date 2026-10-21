import cgi
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "forum.db"
INDEX_PATH = ROOT_DIR / "index.html"


def init_storage(db_path: Path, upload_dir: Path) -> None:
    upload_dir.mkdir(parents=True, exist_ok=True)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                period TEXT NOT NULL,
                topic TEXT NOT NULL,
                title TEXT NOT NULL,
                uploader TEXT NOT NULL,
                description TEXT,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS discussions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                author TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def create_handler(db_path: Path, upload_dir: Path, index_path: Path):
    class ForumHandler(BaseHTTPRequestHandler):
        def _send_json(self, payload: dict | list, status: int = HTTPStatus.OK):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _read_json(self):
            content_length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_length)
            return json.loads(raw.decode("utf-8")) if raw else {}

        def _parse_text(self, value):
            if value is None:
                return ""
            if isinstance(value, list):
                value = value[0]
            if hasattr(value, "value"):
                value = value.value
            return str(value).strip()

        def _db(self):
            return sqlite3.connect(db_path)

        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path == "/":
                self._serve_index()
                return
            if parsed.path == "/api/submissions":
                self._get_submissions()
                return
            if parsed.path == "/api/discussions":
                self._get_discussions()
                return
            if parsed.path.startswith("/uploads/"):
                self._serve_upload(parsed.path)
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")

        def do_POST(self):
            parsed = urlparse(self.path)
            if parsed.path == "/api/submissions":
                self._create_submission()
                return
            if parsed.path == "/api/discussions":
                self._create_discussion()
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")

        def _serve_index(self):
            if not index_path.exists():
                self.send_error(HTTPStatus.NOT_FOUND, "index.html missing")
                return
            body = index_path.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _serve_upload(self, path: str):
            filename = os.path.basename(path.replace("/uploads/", "", 1))
            target = (upload_dir / filename).resolve()
            if not str(target).startswith(str(upload_dir.resolve())) or not target.exists():
                self.send_error(HTTPStatus.NOT_FOUND, "File not found")
                return
            body = target.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.end_headers()
            self.wfile.write(body)

        def _get_submissions(self):
            with self._db() as conn:
                rows = conn.execute(
                    """
                    SELECT id, period, topic, title, uploader, description,
                           original_filename, stored_filename, created_at
                    FROM submissions
                    ORDER BY id DESC
                    """
                ).fetchall()
            payload = [
                {
                    "id": row[0],
                    "period": row[1],
                    "topic": row[2],
                    "title": row[3],
                    "uploader": row[4],
                    "description": row[5] or "",
                    "original_filename": row[6],
                    "download_url": f"/uploads/{row[7]}",
                    "created_at": row[8],
                }
                for row in rows
            ]
            self._send_json(payload)

        def _get_discussions(self):
            with self._db() as conn:
                rows = conn.execute(
                    """
                    SELECT id, author, content, created_at
                    FROM discussions
                    ORDER BY id DESC
                    """
                ).fetchall()
            payload = [
                {"id": row[0], "author": row[1], "content": row[2], "created_at": row[3]}
                for row in rows
            ]
            self._send_json(payload)

        def _create_submission(self):
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                self._send_json({"error": "Expected multipart/form-data"}, HTTPStatus.BAD_REQUEST)
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": content_type,
                },
            )

            period = self._parse_text(form.getfirst("period"))
            topic = self._parse_text(form.getfirst("topic"))
            title = self._parse_text(form.getfirst("title"))
            uploader = self._parse_text(form.getfirst("uploader"))
            description = self._parse_text(form.getfirst("description"))

            if "document" not in form:
                self._send_json({"error": "document is required"}, HTTPStatus.BAD_REQUEST)
                return
            file_item = form["document"]
            if not getattr(file_item, "filename", ""):
                self._send_json({"error": "document filename is required"}, HTTPStatus.BAD_REQUEST)
                return

            if not period or not topic or not title or not uploader:
                self._send_json(
                    {"error": "period, topic, title, uploader are required"},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            original_filename = os.path.basename(file_item.filename)
            suffix = Path(original_filename).suffix
            stored_filename = (
                f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex}{suffix}"
            )
            content = file_item.file.read()
            (upload_dir / stored_filename).write_bytes(content)

            now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
            with self._db() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO submissions
                    (period, topic, title, uploader, description,
                     original_filename, stored_filename, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        period,
                        topic,
                        title,
                        uploader,
                        description,
                        original_filename,
                        stored_filename,
                        now,
                    ),
                )
                submission_id = cursor.lastrowid

            self._send_json(
                {
                    "id": submission_id,
                    "period": period,
                    "topic": topic,
                    "title": title,
                    "uploader": uploader,
                    "description": description,
                    "original_filename": original_filename,
                    "download_url": f"/uploads/{stored_filename}",
                    "created_at": now,
                },
                HTTPStatus.CREATED,
            )

        def _create_discussion(self):
            try:
                payload = self._read_json()
            except json.JSONDecodeError:
                self._send_json({"error": "Invalid JSON payload"}, HTTPStatus.BAD_REQUEST)
                return

            author = str(payload.get("author", "")).strip()
            content = str(payload.get("content", "")).strip()
            if not author or not content:
                self._send_json(
                    {"error": "author and content are required"},
                    HTTPStatus.BAD_REQUEST,
                )
                return

            now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
            with self._db() as conn:
                cursor = conn.execute(
                    """
                    INSERT INTO discussions (author, content, created_at)
                    VALUES (?, ?, ?)
                    """,
                    (author, content, now),
                )
                discussion_id = cursor.lastrowid

            self._send_json(
                {"id": discussion_id, "author": author, "content": content, "created_at": now},
                HTTPStatus.CREATED,
            )

    return ForumHandler


def run_server(host: str = "127.0.0.1", port: int = 8000):
    init_storage(DB_PATH, UPLOAD_DIR)
    handler = create_handler(DB_PATH, UPLOAD_DIR, INDEX_PATH)
    server = ThreadingHTTPServer((host, port), handler)
    print(f"Physics AI Forum running at http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
