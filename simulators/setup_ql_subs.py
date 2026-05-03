"""
Setup QuantumLeap subscriptions with staggered timing.
Lets QL create each table before the next subscription fires.
"""
import os, sys, time, logging
sys.path.insert(0, '/app')

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s -- %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("setup_ql")

os.environ.setdefault('ORION_URL',          'http://orion:1026')
os.environ.setdefault('QL_URL',             'http://quantumleap:8668')
os.environ.setdefault('FIWARE_SERVICE',     'irfane')
os.environ.setdefault('FIWARE_SERVICEPATH', '/smartcity')

import requests

ORION_URL   = os.environ['ORION_URL']
QL_URL      = os.environ['QL_URL']
SERVICE     = os.environ['FIWARE_SERVICE']
SERVICEPATH = os.environ['FIWARE_SERVICEPATH']

GET_HEADERS = {"Fiware-Service": SERVICE}
SUB_HEADERS = {"Content-Type": "application/json", "Fiware-Service": SERVICE}

ENTITY_TYPES = [
    "TrafficFlowObserved",
    "Vehicle",
    "WeatherObserved",
    "GreenSpaceRecord",
]

def delete_all_ql_subs():
    """Remove all existing QL subscriptions."""
    r = requests.get(f"{ORION_URL}/v2/subscriptions", headers=GET_HEADERS, timeout=5)
    for sub in r.json():
        if "QL_sub" in sub.get("description", ""):
            sid = sub["id"]
            requests.delete(
                f"{ORION_URL}/v2/subscriptions/{sid}",
                headers=GET_HEADERS,
                timeout=5
            )
            log.info(f"Deleted subscription: {sid} ({sub.get('description')})")

def create_sub(entity_type):
    desc = f"QL_sub_{entity_type}"
    sub = {
        "description": desc,
        "subject": {
            "entities":  [{"idPattern": ".*", "type": entity_type}],
            "condition": {"attrs": []},
        },
        "notification": {
            "http":     {"url": f"{QL_URL}/v2/notify"},
            "attrs":    [],
            "metadata": ["dateCreated", "dateModified"],
        },
        "throttling": 1,
    }
    r = requests.post(f"{ORION_URL}/v2/subscriptions", json=sub, headers=SUB_HEADERS, timeout=5)
    if r.ok:
        log.info(f"Created: {desc} -> {r.headers.get('Location')}")
    else:
        log.error(f"Failed: {desc} {r.status_code} {r.text}")
    return r.ok

def notify_ql(entity_type):
    """Force a notification to QL to trigger table creation."""
    r = requests.get(
        f"{ORION_URL}/v2/entities?type={entity_type}&limit=1",
        headers={**GET_HEADERS, "Fiware-ServicePath": SERVICEPATH},
        timeout=5
    )
    entities = r.json()
    if not entities:
        log.warning(f"No entities of type {entity_type} to notify with")
        return

    # Patch an attribute to trigger the subscription
    entity = entities[0]
    eid = entity["id"]
    patch_headers = {
        "Content-Type":       "application/json",
        "Fiware-Service":     SERVICE,
        "Fiware-ServicePath": SERVICEPATH,
    }
    # Touch dateObserved to trigger notification
    requests.patch(
        f"{ORION_URL}/v2/entities/{requests.utils.quote(eid, safe='')}/attrs",
        json={"dateObserved": {"type": "DateTime", "value": entity.get("dateObserved", {}).get("value", "2026-01-01T00:00:00Z")}},
        headers=patch_headers,
        timeout=5
    )
    log.info(f"Triggered notification for {entity_type} via {eid}")

def wait_for_table(entity_type, retries=10, delay=3):
    """Poll QL until the table for this entity type exists."""
    ql_headers = {"Fiware-Service": SERVICE, "Fiware-ServicePath": SERVICEPATH}
    # Get first entity id
    r = requests.get(
        f"{ORION_URL}/v2/entities?type={entity_type}&limit=1",
        headers={**GET_HEADERS, "Fiware-ServicePath": SERVICEPATH},
        timeout=5
    )
    entities = r.json()
    if not entities:
        return False
    eid = entities[0]["id"]
    
    for i in range(retries):
        try:
            r = requests.get(
                f"{QL_URL}/v2/entities/{requests.utils.quote(eid, safe='')}/attrs/dateObserved?lastN=1",
                headers=ql_headers,
                timeout=5
            )
            if r.status_code == 200:
                log.info(f"Table ready for {entity_type}")
                return True
        except Exception:
            pass
        log.info(f"Waiting for {entity_type} table... ({i+1}/{retries})")
        time.sleep(delay)
    return False

def main():
    log.info("=== QuantumLeap Subscription Setup ===")

    # Step 1: Remove old subs
    log.info("Removing existing QL subscriptions...")
    delete_all_ql_subs()
    time.sleep(2)

    # Step 2: Create one sub at a time, wait for table, then next
    for entity_type in ENTITY_TYPES:
        log.info(f"--- Setting up {entity_type} ---")
        if create_sub(entity_type):
            time.sleep(3)           # let subscription activate
            notify_ql(entity_type)  # trigger first notification
            wait_for_table(entity_type)
        time.sleep(2)

    log.info("=== All QL subscriptions ready ===")

    # Verify
    r = requests.get(f"{ORION_URL}/v2/subscriptions", headers=GET_HEADERS, timeout=5)
    ql_subs = [s for s in r.json() if "QL_sub" in s.get("description", "")]
    log.info(f"Active QL subscriptions: {len(ql_subs)}")
    for s in ql_subs:
        log.info(f"  {s['description']} -- timesSent: {s['notification'].get('timesSent', 0)}")

if __name__ == "__main__":
    main()