from importlib.metadata import version


def running_version() -> str:
    return version("kivu-ferry-worker")
