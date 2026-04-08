import logging
import threading
import time
from collections import deque
from contextlib import contextmanager


class DependencyTelemetry:
    def __init__(self, max_entries=100):
        self._entries = deque(maxlen=max_entries)
        self._lock = threading.RLock()
        self._logger = logging.getLogger("jackbox.dependency")

    def record(self, dependency, operation, success, latency_ms, details="", error=""):
        entry = {
            "timestamp": time.strftime("%H:%M:%S"),
            "dependency": dependency,
            "operation": operation,
            "success": success,
            "latency_ms": round(latency_ms, 1),
            "details": details,
            "error": error,
        }
        with self._lock:
            self._entries.appendleft(entry)

        message = (
            f"{dependency}.{operation} {'ok' if success else 'failed'} "
            f"in {entry['latency_ms']}ms"
        )
        if details:
            message += f" details={details}"
        if error:
            message += f" error={error}"

        log_fn = self._logger.info if success else self._logger.warning
        log_fn(message)
        return entry

    def snapshot(self):
        with self._lock:
            entries = list(self._entries)

        total = len(entries)
        success_count = sum(1 for entry in entries if entry["success"])
        failure_count = total - success_count
        average_latency_ms = round(
            sum(entry["latency_ms"] for entry in entries) / total,
            1,
        ) if total else 0.0

        per_dependency = {}
        for dependency_name in ("jackbox", "browser", "ai"):
            dependency_entries = [entry for entry in entries if entry["dependency"] == dependency_name]
            per_dependency[dependency_name] = {
                "total": len(dependency_entries),
                "success_count": sum(1 for entry in dependency_entries if entry["success"]),
                "failure_count": sum(1 for entry in dependency_entries if not entry["success"]),
            }

        return {
            "total": total,
            "success_count": success_count,
            "failure_count": failure_count,
            "average_latency_ms": average_latency_ms,
            "entries": entries[:25],
            "per_dependency": per_dependency,
        }


dependency_tracker = DependencyTelemetry()


@contextmanager
def track_dependency_call(dependency, operation, details=""):
    started_at = time.perf_counter()
    try:
        yield
    except Exception as exc:
        dependency_tracker.record(
            dependency=dependency,
            operation=operation,
            success=False,
            latency_ms=(time.perf_counter() - started_at) * 1000,
            details=details,
            error=f"{type(exc).__name__}: {exc}",
        )
        raise
    else:
        dependency_tracker.record(
            dependency=dependency,
            operation=operation,
            success=True,
            latency_ms=(time.perf_counter() - started_at) * 1000,
            details=details,
        )
