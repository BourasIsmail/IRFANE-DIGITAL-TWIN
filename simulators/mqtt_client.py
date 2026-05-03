"""
MQTT client wrapper for the Irfane simulator.
Publishes sensor readings to Mosquitto broker.
IoT Agent JSON subscribes and translates to NGSI-v2 -> Orion.

Topic pattern: /<apikey>/<entity_id>/attrs
"""

import os
import json
import time
import logging
import paho.mqtt.client as mqtt

MQTT_HOST   = os.getenv("MQTT_HOST",   "localhost")
MQTT_PORT   = int(os.getenv("MQTT_PORT", "1883"))
MQTT_APIKEY = os.getenv("MQTT_APIKEY", "irfane2024")

log = logging.getLogger("mqtt")


class MQTTPublisher:
    def __init__(self):
        self._client = mqtt.Client(client_id="idt-simulator", clean_session=True)
        self._client.on_connect    = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._connected = False

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self._connected = True
            log.info(f"Connected to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
        else:
            log.error(f"MQTT connection failed with code {rc}")

    def _on_disconnect(self, client, userdata, rc):
        self._connected = False
        if rc != 0:
            log.warning(f"Unexpected MQTT disconnect (rc={rc}), will retry...")

    def connect(self, retries=30, delay=4.0):
        for attempt in range(1, retries + 1):
            try:
                self._client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
                self._client.loop_start()
                # Wait for connection confirmation
                for _ in range(20):
                    if self._connected:
                        return
                    time.sleep(0.3)
                raise ConnectionError("No confirmation within timeout")
            except Exception as e:
                log.warning(f"MQTT not ready ({attempt}/{retries}): {e}")
                if attempt < retries:
                    time.sleep(delay)
        raise RuntimeError(f"Could not connect to MQTT broker at {MQTT_HOST}:{MQTT_PORT}")

    def publish(self, entity_id: str, payload: dict):
        """
        Publish sensor reading to IoT Agent JSON topic.
        Topic: /<apikey>/<entity_id>/attrs
        """
        topic = f"/{MQTT_APIKEY}/{entity_id}/attrs"
        message = json.dumps(payload)
        result = self._client.publish(topic, message, qos=1)
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"MQTT publish failed for {entity_id}: rc={result.rc}")
        return topic

    def disconnect(self):
        self._client.loop_stop()
        self._client.disconnect()