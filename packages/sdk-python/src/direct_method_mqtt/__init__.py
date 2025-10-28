"""Direct Method MQTT Client for Python.

This package provides a simple MQTT client implementation for Python,
part of the Direct Method Library demo project.
"""

from .client import DirectMethodMqttClient, MessageCallback

__all__ = ["DirectMethodMqttClient", "MessageCallback"]
__version__ = "1.0.0"