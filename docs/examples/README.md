# Direct Method Library - Usage Examples

This directory contains practical examples demonstrating how to use the Direct Method Library across different programming languages and scenarios.

## Basic Examples

### Simple Publisher-Subscriber

Each platform implementation provides the same core functionality with platform-specific syntax.

#### Python Example
```python
from direct_method_mqtt import DirectMethodMqttClient
import time

def handle_message(topic, message):
    print(f"Received: {message} on {topic}")

# Create and configure client
client = DirectMethodMqttClient("localhost", 1883, "demo/basic")
client.on_message_received(handle_message)

try:
    # Connect and subscribe
    client.connect()
    client.subscribe()
    
    # Publish some messages
    for i in range(5):
        client.publish(f"Message {i} from Python")
        time.sleep(1)
    
    # Wait for any remaining messages
    time.sleep(2)
    
finally:
    client.disconnect()
```

#### Node.js Example
```typescript
import { DirectMethodMqttClient } from 'direct-method-mqtt-client';

async function basicExample() {
    const client = new DirectMethodMqttClient('localhost', 1883, 'demo/basic');
    
    // Set up message handler
    client.onMessageReceived((topic, message) => {
        console.log(`Received: ${message} on ${topic}`);
    });
    
    try {
        // Connect and subscribe
        await client.connect();
        await client.subscribe();
        
        // Publish some messages
        for (let i = 0; i < 5; i++) {
            await client.publish(`Message ${i} from Node.js`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Wait for any remaining messages
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } finally {
        await client.disconnect();
    }
}

basicExample().catch(console.error);
```

#### .NET Example
```csharp
using DirectMethod.Mqtt.Client;

class Program
{
    static async Task Main(string[] args)
    {
        using var client = new DirectMethodMqttClient("localhost", 1883, "demo/basic");
        
        // Set up message handler
        client.MessageReceived += (topic, message) =>
        {
            Console.WriteLine($"Received: {message} on {topic}");
        };
        
        try
        {
            // Connect and subscribe
            await client.ConnectAsync();
            await client.SubscribeAsync();
            
            // Publish some messages
            for (int i = 0; i < 5; i++)
            {
                await client.PublishAsync($"Message {i} from C#");
                await Task.Delay(1000);
            }
            
            // Wait for any remaining messages
            await Task.Delay(2000);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}
```

## Advanced Examples

### JSON Message Processing

#### Python - Sensor Data Processing
```python
import json
import random
import time
from direct_method_mqtt import DirectMethodMqttClient

class SensorDataProcessor:
    def __init__(self, broker_host, topic):
        self.client = DirectMethodMqttClient(broker_host, 1883, topic)
        self.client.on_message_received(self.process_sensor_data)
        self.readings = []
    
    def process_sensor_data(self, topic, message):
        try:
            data = json.loads(message)
            self.readings.append(data)
            
            print(f"Sensor {data['sensor_id']}: {data['value']}°C at {data['timestamp']}")
            
            # Alert on high temperature
            if data['value'] > 30:
                alert = {
                    "type": "alert",
                    "message": f"High temperature: {data['value']}°C",
                    "sensor_id": data['sensor_id'],
                    "timestamp": data['timestamp']
                }
                self.client.publish(json.dumps(alert))
                
        except json.JSONDecodeError:
            print(f"Invalid JSON message: {message}")
        except KeyError as e:
            print(f"Missing field in sensor data: {e}")
    
    def simulate_sensor_data(self):
        """Simulate sensor data publishing."""
        for i in range(10):
            sensor_data = {
                "sensor_id": f"temp_{random.randint(1, 3)}",
                "value": round(random.uniform(18, 35), 1),
                "unit": "celsius",
                "timestamp": time.time()
            }
            self.client.publish(json.dumps(sensor_data))
            time.sleep(2)
    
    def run(self):
        try:
            self.client.connect()
            self.client.subscribe()
            self.simulate_sensor_data()
            time.sleep(5)  # Wait for processing
            
            print(f"\nProcessed {len(self.readings)} sensor readings")
            
        finally:
            self.client.disconnect()

# Run the sensor data processor
processor = SensorDataProcessor("localhost", "sensors/temperature")
processor.run()
```

#### Node.js - IoT Device Manager
```typescript
import { DirectMethodMqttClient } from 'direct-method-mqtt-client';

interface DeviceMessage {
    deviceId: string;
    messageType: 'telemetry' | 'command' | 'status';
    payload: any;
    timestamp: number;
}

class IoTDeviceManager {
    private client: DirectMethodMqttClient;
    private devices: Map<string, any> = new Map();
    
    constructor(brokerHost: string, topic: string) {
        this.client = new DirectMethodMqttClient(brokerHost, 1883, topic);
        this.client.onMessageReceived(this.handleDeviceMessage.bind(this));
    }
    
    private handleDeviceMessage(topic: string, message: string): void {
        try {
            const deviceMsg: DeviceMessage = JSON.parse(message);
            
            switch (deviceMsg.messageType) {
                case 'telemetry':
                    this.processTelemetry(deviceMsg);
                    break;
                case 'status':
                    this.updateDeviceStatus(deviceMsg);
                    break;
                case 'command':
                    this.executeCommand(deviceMsg);
                    break;
                default:
                    console.log(`Unknown message type: ${deviceMsg.messageType}`);
            }
        } catch (error) {
            console.error(`Error processing message: ${error.message}`);
        }
    }
    
    private processTelemetry(msg: DeviceMessage): void {
        console.log(`📊 Telemetry from ${msg.deviceId}:`, msg.payload);
        
        // Store device data
        if (!this.devices.has(msg.deviceId)) {
            this.devices.set(msg.deviceId, { telemetry: [], lastSeen: 0 });
        }
        
        const device = this.devices.get(msg.deviceId);
        device.telemetry.push(msg.payload);
        device.lastSeen = msg.timestamp;
    }
    
    private updateDeviceStatus(msg: DeviceMessage): void {
        console.log(`📡 Status update from ${msg.deviceId}:`, msg.payload.status);
        
        if (!this.devices.has(msg.deviceId)) {
            this.devices.set(msg.deviceId, { status: 'unknown', lastSeen: 0 });
        }
        
        const device = this.devices.get(msg.deviceId);
        device.status = msg.payload.status;
        device.lastSeen = msg.timestamp;
    }
    
    private async executeCommand(msg: DeviceMessage): Promise<void> {
        console.log(`🔧 Executing command for ${msg.deviceId}:`, msg.payload.command);
        
        // Simulate command execution
        const response: DeviceMessage = {
            deviceId: 'manager',
            messageType: 'command',
            payload: {
                targetDevice: msg.deviceId,
                command: msg.payload.command,
                status: 'executed',
                result: 'success'
            },
            timestamp: Date.now()
        };
        
        await this.client.publish(JSON.stringify(response));
    }
    
    private async simulateDeviceActivity(): Promise<void> {
        const deviceIds = ['device_001', 'device_002', 'device_003'];
        
        for (let i = 0; i < 15; i++) {
            const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
            const messageType = ['telemetry', 'status'][Math.floor(Math.random() * 2)] as 'telemetry' | 'status';
            
            let payload: any;
            if (messageType === 'telemetry') {
                payload = {
                    temperature: Math.round(Math.random() * 40 + 10),
                    humidity: Math.round(Math.random() * 100),
                    battery: Math.round(Math.random() * 100)
                };
            } else {
                payload = {
                    status: ['online', 'offline', 'maintenance'][Math.floor(Math.random() * 3)]
                };
            }
            
            const message: DeviceMessage = {
                deviceId,
                messageType,
                payload,
                timestamp: Date.now()
            };
            
            await this.client.publish(JSON.stringify(message));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    async run(): Promise<void> {
        try {
            await this.client.connect();
            await this.client.subscribe();
            
            console.log('🚀 IoT Device Manager started');
            await this.simulateDeviceActivity();
            
            // Wait for message processing
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('\n📋 Device Summary:');
            this.devices.forEach((data, deviceId) => {
                console.log(`  ${deviceId}: ${JSON.stringify(data, null, 2)}`);
            });
            
        } finally {
            await this.client.disconnect();
        }
    }
}

// Run the IoT device manager
const manager = new IoTDeviceManager('localhost', 'iot/devices');
manager.run().catch(console.error);
```

#### .NET - Real-time Chat Application
```csharp
using DirectMethod.Mqtt.Client;
using System.Text.Json;

public class ChatMessage
{
    public string Username { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string MessageType { get; set; } = "message"; // message, join, leave
}

public class ChatApplication
{
    private readonly DirectMethodMqttClient _client;
    private readonly string _username;
    private readonly List<ChatMessage> _messageHistory = new();

    public ChatApplication(string brokerHost, string chatRoom, string username)
    {
        _username = username;
        _client = new DirectMethodMqttClient(brokerHost, 1883, $"chat/{chatRoom}");
        _client.MessageReceived += HandleChatMessage;
    }

    private void HandleChatMessage(string topic, string message)
    {
        try
        {
            var chatMessage = JsonSerializer.Deserialize<ChatMessage>(message);
            if (chatMessage != null)
            {
                _messageHistory.Add(chatMessage);
                DisplayMessage(chatMessage);
            }
        }
        catch (JsonException)
        {
            Console.WriteLine($"Invalid message format: {message}");
        }
    }

    private void DisplayMessage(ChatMessage message)
    {
        var timestamp = message.Timestamp.ToString("HH:mm:ss");
        
        switch (message.MessageType)
        {
            case "message":
                Console.WriteLine($"[{timestamp}] {message.Username}: {message.Message}");
                break;
            case "join":
                Console.WriteLine($"[{timestamp}] *** {message.Username} joined the chat");
                break;
            case "leave":
                Console.WriteLine($"[{timestamp}] *** {message.Username} left the chat");
                break;
        }
    }

    private async Task SendMessage(string message, string messageType = "message")
    {
        var chatMessage = new ChatMessage
        {
            Username = _username,
            Message = message,
            Timestamp = DateTime.UtcNow,
            MessageType = messageType
        };

        var json = JsonSerializer.Serialize(chatMessage);
        await _client.PublishAsync(json);
    }

    public async Task StartChat()
    {
        try
        {
            await _client.ConnectAsync();
            await _client.SubscribeAsync();

            // Announce joining
            await SendMessage("", "join");
            
            Console.WriteLine($"🚀 Chat started as '{_username}'. Type 'quit' to exit.");
            Console.WriteLine("📜 Message history will appear here...\n");

            // Simulate some chat activity
            var messages = new[]
            {
                "Hello everyone!",
                "How is everyone doing today?",
                "This MQTT chat is pretty cool!",
                "Anyone working on interesting projects?",
                "Great to see the Direct Method Library in action!"
            };

            foreach (var msg in messages)
            {
                await SendMessage(msg);
                await Task.Delay(2000);
            }

            // Wait for responses
            await Task.Delay(5000);

            // Announce leaving
            await SendMessage("", "leave");
            
            Console.WriteLine($"\n📊 Chat session ended. Processed {_messageHistory.Count} messages.");
        }
        finally
        {
            await _client.DisconnectAsync();
            _client.Dispose();
        }
    }
}

// Example usage
public class Program
{
    public static async Task Main(string[] args)
    {
        var chat = new ChatApplication("localhost", "general", "DemoUser");
        await chat.StartChat();
    }
}
```

## Error Handling Examples

### Robust Connection with Retry Logic

#### Python
```python
import time
from direct_method_mqtt import DirectMethodMqttClient

def connect_with_retry(client, max_retries=3, retry_delay=5.0):
    """Connect with exponential backoff retry logic."""
    for attempt in range(max_retries):
        try:
            client.connect(timeout=10.0)
            print("✅ Connected successfully!")
            return True
        except ConnectionError as e:
            print(f"❌ Connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                print(f"⏳ Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
    
    print("💥 Failed to connect after all retries")
    return False

# Usage
client = DirectMethodMqttClient("localhost", 1883, "robust/connection")

if connect_with_retry(client):
    try:
        client.subscribe()
        client.publish("Connected with retry logic!")
        time.sleep(2)
    finally:
        client.disconnect()
```

#### Node.js
```typescript
import { DirectMethodMqttClient } from 'direct-method-mqtt-client';

async function connectWithRetry(
    client: DirectMethodMqttClient, 
    maxRetries: number = 3, 
    retryDelay: number = 5000
): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await client.connect();
            console.log('✅ Connected successfully!');
            return true;
        } catch (error) {
            console.log(`❌ Connection attempt ${attempt + 1} failed: ${error.message}`);
            if (attempt < maxRetries - 1) {
                const waitTime = retryDelay * Math.pow(2, attempt); // Exponential backoff
                console.log(`⏳ Retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    console.log('💥 Failed to connect after all retries');
    return false;
}

// Usage
async function robustConnection() {
    const client = new DirectMethodMqttClient('localhost', 1883, 'robust/connection');
    
    if (await connectWithRetry(client)) {
        try {
            await client.subscribe();
            await client.publish('Connected with retry logic!');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            await client.disconnect();
        }
    }
}

robustConnection().catch(console.error);
```

#### .NET
```csharp
using DirectMethod.Mqtt.Client;

public static class ConnectionHelper
{
    public static async Task<bool> ConnectWithRetryAsync(
        DirectMethodMqttClient client,
        int maxRetries = 3,
        TimeSpan? retryDelay = null)
    {
        retryDelay ??= TimeSpan.FromSeconds(5);
        
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                await client.ConnectAsync();
                Console.WriteLine("✅ Connected successfully!");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Connection attempt {attempt + 1} failed: {ex.Message}");
                
                if (attempt < maxRetries - 1)
                {
                    var waitTime = TimeSpan.FromMilliseconds(retryDelay.Value.TotalMilliseconds * Math.Pow(2, attempt));
                    Console.WriteLine($"⏳ Retrying in {waitTime.TotalSeconds} seconds...");
                    await Task.Delay(waitTime);
                }
            }
        }
        
        Console.WriteLine("💥 Failed to connect after all retries");
        return false;
    }
}

// Usage
public class Program
{
    public static async Task Main(string[] args)
    {
        using var client = new DirectMethodMqttClient("localhost", 1883, "robust/connection");
        
        if (await ConnectionHelper.ConnectWithRetryAsync(client))
        {
            try
            {
                await client.SubscribeAsync();
                await client.PublishAsync("Connected with retry logic!");
                await Task.Delay(2000);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during operation: {ex.Message}");
            }
        }
    }
}
```

## Running the Examples

### Prerequisites

1. **MQTT Broker**: Install and run Eclipse Mosquitto or another MQTT broker
   ```bash
   # Using Docker
   docker run -it -p 1883:1883 eclipse-mosquitto:2.0
   
   # Or install locally
   # Ubuntu/Debian: sudo apt-get install mosquitto mosquitto-clients
   # macOS: brew install mosquitto
   # Windows: Download from https://mosquitto.org/download/
   ```

2. **Install Packages**: Install the appropriate Direct Method Library package for your platform

### Running Examples

1. **Start MQTT Broker**: Ensure Mosquitto or another MQTT broker is running on localhost:1883

2. **Choose Platform**: Navigate to the appropriate package directory and run the examples

3. **Observe Output**: Examples will show connection status, message publishing, and receiving

### Customization

- Change `localhost` to your broker's hostname/IP
- Modify topics to avoid conflicts with other users
- Adjust timing delays to suit your testing needs
- Add additional error handling as needed for your use case

These examples demonstrate the versatility and consistency of the Direct Method Library across different programming languages and use cases.