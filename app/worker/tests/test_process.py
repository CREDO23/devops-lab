"""Seam: the worker process itself, started for real as a subprocess, as an operator would."""

import json
import os
import signal
import socket
import subprocess
import sys
import time
import tomllib
from pathlib import Path

import httpx

WORKER = [sys.executable, "-m", "kivu_ferry_worker.main"]
SETTINGS = ("DATABASE_URL", "VALKEY_URL", "INTERNAL_PORT", "LOG_LEVEL")


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port: int = probe.getsockname()[1]
        return port


def environment(**overrides: str) -> dict[str, str]:
    # Starts from a clean slate so variables set in the developer's shell can't leak in.
    base = {k: v for k, v in os.environ.items() if k not in SETTINGS}
    return {**base, **overrides}


def start_worker(**extra_settings: str) -> tuple[subprocess.Popen[str], int]:
    port = free_port()
    process = subprocess.Popen(
        WORKER,
        env=environment(
            DATABASE_URL="postgresql://kivu:kivu@127.0.0.1:1/kivu",
            VALKEY_URL="redis://127.0.0.1:1/0",
            INTERNAL_PORT=str(port),
            **extra_settings,
        ),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        try:
            if httpx.get(f"http://127.0.0.1:{port}/livez").status_code == 200:
                return process, port
        except httpx.TransportError:
            time.sleep(0.1)
    process.kill()
    raise AssertionError("the worker didn't start within 10 seconds")


def is_json_object(line: str) -> bool:
    try:
        return isinstance(json.loads(line), dict)
    except json.JSONDecodeError:
        return False


def test_missing_variable_stops_the_worker_and_is_named() -> None:
    """Started without DATABASE_URL, the worker refuses to start and its output names it."""
    result = subprocess.run(
        WORKER,
        env=environment(VALKEY_URL="redis://127.0.0.1:1/0", INTERNAL_PORT="8001"),
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert (result.returncode != 0, "DATABASE_URL" in result.stdout) == (True, True)


def test_every_line_written_is_json() -> None:
    """Every line the worker writes, Uvicorn's included, is JSON, so log tools can read it."""
    process, _ = start_worker()
    process.send_signal(signal.SIGTERM)
    output, _ = process.communicate(timeout=10)

    lines = output.splitlines()
    assert lines and all(is_json_object(line) for line in lines)


def test_startup_is_logged_with_the_running_version() -> None:
    """The start is logged with the version, so the logs show which version ran when."""
    pyproject = tomllib.loads((Path(__file__).parents[1] / "pyproject.toml").read_text())
    process, _ = start_worker()

    process.send_signal(signal.SIGTERM)
    output, _ = process.communicate(timeout=5)

    events = [json.loads(line) for line in output.splitlines() if is_json_object(line)]
    assert {"event": "worker started", "version": pyproject["project"]["version"]} in [
        {k: e.get(k) for k in ("event", "version")} for e in events
    ]


def test_sigterm_lets_the_worker_finish_its_shutdown() -> None:
    """On SIGTERM, the worker finishes in-flight work and logs "worker stopped" within 5 s."""
    process, _ = start_worker()

    process.send_signal(signal.SIGTERM)
    output, _ = process.communicate(timeout=5)

    events = [json.loads(line).get("event") for line in output.splitlines() if is_json_object(line)]
    assert "worker stopped" in events


def test_a_higher_log_level_drops_info_lines() -> None:
    """With LOG_LEVEL=warn, routine lines like "worker started" stay out of the logs."""
    process, _ = start_worker(LOG_LEVEL="warn")

    process.send_signal(signal.SIGTERM)
    output, _ = process.communicate(timeout=5)

    events = [json.loads(line).get("event") for line in output.splitlines() if is_json_object(line)]
    assert "worker started" not in events
