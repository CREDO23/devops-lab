"""The running version, as installed from pyproject.toml."""

from importlib.metadata import version


def running_version() -> str:
    return version("kivu-ferry-worker")
