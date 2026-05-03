"""
FIWARE client -- Orion Context Broker + QuantumLeap HTTP helpers
"""

import os
import time
import json
import logging
import requests

ORION_URL   = os.getenv("ORION_URL",          "http://localhost:1026")
QL_URL      = os.getenv("QL_URL",             "http://localhost:8668")
SERVICE     = os.getenv("FIWARE_SERVICE",     "irfane")
SERVICEPATH = os.getenv("FIWARE_SERVICEPATH", "/smartcity")

HEADERS = {
    "Content-Type":       "application/json",
    "Fiware-Service":     SERVICE,
    "Fiware-ServicePath": SERVICEPATH,
}

GET_HEADERS = {
    "Fiware-Service": SERVICE,
}

SUB_POST_HEADERS = {
    "Content-Type":   "application/json",
    "Fiware-Service": SERVICE,
}

log = logging.getLogger("fiware")


def wait_for(url: str, label: str, retries: int = 20, delay: float = 4.0):
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, timeout=5)
            r.raise_for_status()
            log.info(f"{label} is ready.")
            return
        except Exception as e:
            log.warning(f"{label} not ready (attempt {attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(delay)
    raise RuntimeError(f"{label} did not become ready after {retries} attempts.")


def _scan_bad_chars(obj, path=""):
    """Recursively find non-ASCII characters in any string value."""
    bad = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            bad.extend(_scan_bad_chars(v, f"{path}.{k}"))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            bad.extend(_scan_bad_chars(v, f"{path}[{i}]"))
    elif isinstance(obj, str):
        for i, c in enumerate(obj):
            if ord(c) > 127:
                bad.append((path, i, c, obj))
    return bad


def upsert_entity(entity: dict) -> str:
    eid = entity["id"]
    url_base = f"{ORION_URL}/v2/entities/{requests.utils.quote(eid, safe='')}"

    r = requests.get(url_base, headers=GET_HEADERS, timeout=5)
    if r.status_code == 404:
        resp = requests.post(
            f"{ORION_URL}/v2/entities",
            json=entity,
            headers=HEADERS,
            timeout=5,
        )
        if not resp.ok:
            # Log the exact bad field
            bad = _scan_bad_chars(entity)
            if bad:
                for path, pos, ch, val in bad:
                    log.error(f"Non-ASCII in entity {eid} at {path}[{pos}]: {repr(ch)} in {repr(val)}")
            else:
                log.error(f"POST {eid} failed {resp.status_code}: {resp.text}")
                log.error(f"Entity JSON: {json.dumps(entity, ensure_ascii=False)}")
            resp.raise_for_status()
        return "created"
    else:
        r.raise_for_status()
        attrs = {k: v for k, v in entity.items() if k not in ("id", "type")}
        resp = requests.patch(
            f"{url_base}/attrs",
            json=attrs,
            headers=HEADERS,
            timeout=5,
        )
        if not resp.ok:
            bad = _scan_bad_chars(attrs)
            if bad:
                for path, pos, ch, val in bad:
                    log.error(f"Non-ASCII in entity {eid} at {path}[{pos}]: {repr(ch)} in {repr(val)}")
            else:
                log.error(f"PATCH {eid} failed {resp.status_code}: {resp.text}")
                log.error(f"Attrs JSON: {json.dumps(attrs, ensure_ascii=False)}")
            resp.raise_for_status()
        return "updated"


def ensure_ql_subscription(entity_type: str):
    desc = f"QL_sub_{entity_type}"

    r = requests.get(f"{ORION_URL}/v2/subscriptions", headers=GET_HEADERS, timeout=5)
    if not r.ok:
        log.error(f"GET /v2/subscriptions failed {r.status_code}: {r.text}")
        r.raise_for_status()

    if any(s.get("description") == desc for s in r.json()):
        log.info(f"Subscription for {entity_type} already exists.")
        return

    sub = {
        "description": desc,
        "subject": {
            "entities": [{"idPattern": ".*", "type": entity_type}],
            "condition": {"attrs": []},
        },
        "notification": {
            "http": {"url": f"{QL_URL}/v2/notify"},
            "attrs": [],
            "metadata": ["dateCreated", "dateModified"],
        },
        "throttling": 1,
    }
    resp = requests.post(
        f"{ORION_URL}/v2/subscriptions",
        json=sub,
        headers=SUB_POST_HEADERS,
        timeout=5,
    )
    if not resp.ok:
        log.error(f"POST /v2/subscriptions failed {resp.status_code}: {resp.text}")
        resp.raise_for_status()
    log.info(f"Created QL subscription for {entity_type}: {resp.headers.get('Location')}")


def setup_all_subscriptions(entity_types: list):
    for et in entity_types:
        ensure_ql_subscription(et)