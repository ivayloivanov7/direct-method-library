"""MQTT client implementation for Python using paho-mqtt."""

import logging
import threading
import time
import uuid
from typing import Callable, Optional, Tuple

import paho.mqtt.client as mqtt

# Type alias for message callback function
MessageCallback = Callable[[str, str], None]

logger = logging.getLogger(__name__)


class DirectMethodMqttClient:
    """MQTT client for connecting to brokers, publishing and subscribing to topics.
    
    This class provides a simple interface for MQTT operations including:
    - Connecting to an MQTT broker
    - Publishing messages to a topic  
    - Subscribing to a topic and receiving messages
    
    Example:
        >>> client = DirectMethodMqttClient("localhost", 1883, "test/topic")
        >>> 
        >>> def on_message(topic, message):
        ...     print(f"Received: {message} on topic: {topic}")
        >>> 
        >>> client.on_message_received(on_message)
        >>> client.connect()
        >>> client.subscribe()
        >>> client.publish("Hello World!")
        >>> client.disconnect()
    """

    def __init__(
        self,
        broker_host: str,
        broker_port: int = 1883,
        topic: str = "",
        client_id: Optional[str] = None,
    ) -> None:
        """Initialize the DirectMethodMqttClient.
        
        Args:
            broker_host: MQTT broker hostname or IP address
            broker_port: MQTT broker port (default: 1883)
            topic: Topic to subscribe and publish to
            client_id: Unique client identifier (auto-generated if not provided)
            
        Raises:
            ValueError: If parameters are invalid
        """
        if not broker_host.strip():
            raise ValueError("Broker host cannot be empty")
        
        if not (1 <= broker_port <= 65535):
            raise ValueError("Broker port must be between 1 and 65535")
        
        if not topic.strip():
            raise ValueError("Topic cannot be empty")

        self._broker_host = broker_host
        self._broker_port = broker_port
        self._topic = topic
        self._client_id = client_id or f"direct-method-client-{uuid.uuid4().hex[:8]}"
        
        # Create MQTT client
        self._client = mqtt.Client(client_id=self._client_id, protocol=mqtt.MQTTv311)
        
        # Connection state
        self._is_connected = False
        self._connection_lock = threading.Lock()
        
        # Message callback
        self._message_callback: Optional[MessageCallback] = None
        
        # Set up MQTT client callbacks
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message
        self._client.on_publish = self._on_publish
        self._client.on_subscribe = self._on_subscribe
        self._client.on_log = self._on_log

    def connect(self, timeout: float = 5.0) -> None:
        """Connect to the MQTT broker.
        
        Args:
            timeout: Connection timeout in seconds (default: 5.0)
            
        Raises:
            ConnectionError: If connection fails
            RuntimeError: If already connected
        """
        with self._connection_lock:
            if self._is_connected:
                logger.info("Already connected to MQTT broker")
                return

            try:
                logger.info(f"Connecting to MQTT broker at {self._broker_host}:{self._broker_port}")
                
                # Connect to broker
                result_code = self._client.connect(
                    host=self._broker_host,
                    port=self._broker_port,
                    keepalive=60
                )
                
                if result_code != mqtt.MQTT_ERR_SUCCESS:
                    raise ConnectionError(f"Failed to initiate connection: {mqtt.error_string(result_code)}")
                
                # Start the network loop
                self._client.loop_start()
                
                # Wait for connection to be established
                start_time = time.time()
                while not self._is_connected and (time.time() - start_time) < timeout:
                    time.sleep(0.1)
                
                if not self._is_connected:
                    self._client.loop_stop()
                    raise ConnectionError(f"Connection timeout after {timeout} seconds")
                
            except Exception as e:
                self._client.loop_stop()
                if isinstance(e, ConnectionError):
                    raise
                raise ConnectionError(f"Failed to connect to MQTT broker: {e}") from e

    def disconnect(self) -> None:
        """Disconnect from the MQTT broker."""
        with self._connection_lock:
            if not self._is_connected:
                logger.info("Not connected to MQTT broker")
                return

            try:
                logger.info("Disconnecting from MQTT broker")
                self._client.disconnect()
                self._client.loop_stop()
                self._is_connected = False
                logger.info("Disconnected from MQTT broker")
            except Exception as e:
                logger.error(f"Error during disconnect: {e}")
                self._is_connected = False

    def publish(self, message: str) -> None:
        """Publish a message to the configured topic.
        
        Args:
            message: Message to publish
            
        Raises:
            RuntimeError: If not connected to broker
            ValueError: If message is empty
            PublishError: If publish operation fails
        """
        if not message:
            raise ValueError("Message cannot be empty")
        
        if not self._is_connected:
            raise RuntimeError("Not connected to MQTT broker. Call connect() first.")

        try:
            result = self._client.publish(topic=self._topic, payload=message, qos=0)
            
            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                raise RuntimeError(f"Failed to publish message: {mqtt.error_string(result.rc)}")
            
            logger.info(f'Published message: "{message}" to topic: {self._topic}')
            
        except Exception as e:
            if isinstance(e, RuntimeError):
                raise
            raise RuntimeError(f"Failed to publish message: {e}") from e

    def subscribe(self) -> None:
        """Subscribe to the configured topic.
        
        Raises:
            RuntimeError: If not connected to broker or subscription fails
        """
        if not self._is_connected:
            raise RuntimeError("Not connected to MQTT broker. Call connect() first.")

        try:
            result, _ = self._client.subscribe(topic=self._topic, qos=0)
            
            if result != mqtt.MQTT_ERR_SUCCESS:
                raise RuntimeError(f"Failed to subscribe to topic: {mqtt.error_string(result)}")
            
            logger.info(f"Subscribed to topic: {self._topic}")
            
        except Exception as e:
            if isinstance(e, RuntimeError):
                raise
            raise RuntimeError(f"Failed to subscribe to topic: {e}") from e

    def on_message_received(self, callback: MessageCallback) -> None:
        """Set a callback function to handle received messages.
        
        Args:
            callback: Function to call when a message is received.
                     Should accept (topic: str, message: str) parameters.
        """
        self._message_callback = callback

    @property
    def is_connected(self) -> bool:
        """Get the current connection status.
        
        Returns:
            True if connected to MQTT broker, false otherwise
        """
        return self._is_connected

    @property 
    def topic(self) -> str:
        """Get the configured topic.
        
        Returns:
            The topic string
        """
        return self._topic

    @property
    def broker_info(self) -> Tuple[str, int]:
        """Get the broker connection details.
        
        Returns:
            Tuple containing (broker_host, broker_port)
        """
        return (self._broker_host, self._broker_port)

    @property
    def client_id(self) -> str:
        """Get the client ID.
        
        Returns:
            The client ID string
        """
        return self._client_id

    def _on_connect(self, client: mqtt.Client, userdata: object, flags: dict, rc: int) -> None:
        """Callback for when the client receives a CONNACK response from the server."""
        if rc == 0:
            self._is_connected = True
            logger.info(f"Connected to MQTT broker at {self._broker_host}:{self._broker_port}")
        else:
            self._is_connected = False
            error_msg = f"Connection failed with result code {rc}: {mqtt.connack_string(rc)}"
            logger.error(error_msg)

    def _on_disconnect(self, client: mqtt.Client, userdata: object, rc: int) -> None:
        """Callback for when the client disconnects from the broker."""
        self._is_connected = False
        if rc != 0:
            logger.warning(f"Unexpected disconnection from MQTT broker: {mqtt.error_string(rc)}")
        else:
            logger.info("MQTT connection closed")

    def _on_message(self, client: mqtt.Client, userdata: object, msg: mqtt.MQTTMessage) -> None:
        """Callback for when a PUBLISH message is received from the server."""
        try:
            topic = msg.topic
            message = msg.payload.decode('utf-8')
            
            if self._message_callback:
                self._message_callback(topic, message)
            else:
                logger.info(f"Received message: {message} on topic: {topic}")
                
        except Exception as e:
            logger.error(f"Error processing received message: {e}")

    def _on_publish(self, client: mqtt.Client, userdata: object, mid: int) -> None:
        """Callback for when a message published by this client is successfully sent."""
        logger.debug(f"Message {mid} published successfully")

    def _on_subscribe(self, client: mqtt.Client, userdata: object, mid: int, granted_qos: list) -> None:
        """Callback for when the broker responds to a subscribe request."""
        logger.debug(f"Subscription {mid} granted with QoS: {granted_qos}")

    def _on_log(self, client: mqtt.Client, userdata: object, level: int, buf: str) -> None:
        """Callback for MQTT client logging."""
        if level <= mqtt.MQTT_LOG_WARNING:
            logger.debug(f"MQTT: {buf}")

    def __enter__(self) -> "DirectMethodMqttClient":
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        """Context manager exit."""
        self.disconnect()

    def __del__(self) -> None:
        """Destructor to ensure cleanup."""
        try:
            if hasattr(self, '_client') and self._is_connected:
                self.disconnect()
        except Exception:
            pass  # Ignore errors during cleanup