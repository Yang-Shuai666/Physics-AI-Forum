import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib import request

from app import create_handler, init_storage


def build_multipart(fields, file_field, file_name, file_content):
    boundary = "----PhysicsForumBoundary"
    lines = []
    for key, value in fields.items():
        lines.extend(
            [
                f"--{boundary}",
                f'Content-Disposition: form-data; name="{key}"',
                "",
                value,
            ]
        )
    lines.extend(
        [
            f"--{boundary}",
            f'Content-Disposition: form-data; name="{file_field}"; filename="{file_name}"',
            "Content-Type: application/octet-stream",
            "",
        ]
    )
    body = "\r\n".join(lines).encode("utf-8") + b"\r\n" + file_content + b"\r\n"
    body += f"--{boundary}--\r\n".encode("utf-8")
    return boundary, body


class ForumServerTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        base = Path(self.temp_dir.name)
        self.db_path = base / "forum.db"
        self.upload_dir = base / "uploads"
        self.index_path = base / "index.html"
        self.index_path.write_text("<html>ok</html>", encoding="utf-8")
        init_storage(self.db_path, self.upload_dir)
        handler = create_handler(self.db_path, self.upload_dir, self.index_path)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=1)
        self.temp_dir.cleanup()

    def test_discussion_create_and_list(self):
        payload = json.dumps({"author": "Alice", "content": "我们下周分享 agent 总结"}).encode("utf-8")
        req = request.Request(
            f"{self.base_url}/api/discussions",
            data=payload,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        with request.urlopen(req) as resp:
            self.assertEqual(resp.status, 201)

        with request.urlopen(f"{self.base_url}/api/discussions") as resp:
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]["author"], "Alice")
            self.assertIn("agent", data[0]["content"])

    def test_submission_upload_and_list(self):
        fields = {
            "period": "2026-W43",
            "topic": "Agent",
            "title": "多智能体学习笔记",
            "uploader": "Bob",
            "description": "本周学习总结",
        }
        boundary, body = build_multipart(fields, "document", "summary.txt", b"hello forum")
        req = request.Request(
            f"{self.base_url}/api/submissions",
            data=body,
            method="POST",
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        with request.urlopen(req) as resp:
            self.assertEqual(resp.status, 201)
            created = json.loads(resp.read().decode("utf-8"))

        with request.urlopen(f"{self.base_url}/api/submissions") as resp:
            submissions = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(len(submissions), 1)
            self.assertEqual(submissions[0]["title"], "多智能体学习笔记")
            self.assertEqual(submissions[0]["period"], "2026-W43")

        with request.urlopen(f"{self.base_url}{created['download_url']}") as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.read(), b"hello forum")


if __name__ == "__main__":
    unittest.main()
