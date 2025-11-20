# direct-method-mqtt-client

TypeScript/Node.js MQTT client implementation - part of the Direct Method Library.

## Installation

```bash
npm install direct-method-mqtt-client
```

## Quick Start

```typescript
import { DirectMethodMqttClient } from 'direct-method-mqtt-client';

const client = new DirectMethodMqttClient('localhost', 1883, 'test/topic');

// Set up message handler
client.onMessageReceived((topic, message) => {
  console.log(`Received: ${message} on topic: ${topic}`);
});

// Connect and start using the client
async function main() {
  try {
    await client.connect();
    await client.subscribe();
    await client.publish('Hello from TypeScript!');
    
    // Keep the application running to receive messages
    // In a real application, you might want to handle this differently
    setTimeout(async () => {
      await client.disconnect();
    }, 5000);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

## API Reference

### Constructor

```typescript
new DirectMethodMqttClient(brokerHost, brokerPort?, topic, clientId?)
```

- `brokerHost` (string): MQTT broker hostname or IP address
- `brokerPort` (number, optional): MQTT broker port (default: 1883)
- `topic` (string): Topic to subscribe and publish to
- `clientId` (string, optional): Unique client identifier (auto-generated if not provided)

### Methods

#### `connect(): Promise<void>`
Connect to the MQTT broker.

#### `disconnect(): Promise<void>`
Disconnect from the MQTT broker.

#### `publish(message: string): Promise<void>`
Publish a message to the configured topic.

#### `subscribe(): Promise<void>`
Subscribe to the configured topic.

#### `onMessageReceived(callback: MessageCallback): void`
Set a callback function to handle received messages.

- `callback`: Function that receives `(topic: string, message: string) => void`

#### `getConnectionStatus(): boolean`
Get the current connection status.

#### `getTopic(): string`
Get the configured topic.

#### `getBrokerInfo(): { host: string; port: number }`
Get the broker connection details.

## Error Handling

The client includes comprehensive error handling:

```typescript
try {
  await client.connect();
  await client.publish('test message');
} catch (error) {
  console.error('MQTT operation failed:', error.message);
}
```

Common errors:
- Connection failures (broker unreachable, wrong credentials)
- Publish/subscribe failures (not connected, invalid topic)
- Invalid constructor parameters

## Advanced Usage

### Custom Client ID

```typescript
const client = new DirectMethodMqttClient(
  'mqtt.example.com', 
  1883, 
  'sensors/temperature',
  'my-unique-client-id'
);
```

### Message Handling with Context

```typescript
class MqttHandler {
  constructor(private deviceId: string) {}
  
  handleMessage = (topic: string, message: string) => {
    console.log(`Device ${this.deviceId} received: ${message} on ${topic}`);
    // Process message here
  }
}

const handler = new MqttHandler('device-001');
client.onMessageReceived(handler.handleMessage);
```

## Requirements

- Node.js 18.0.0 or higher
- TypeScript 5.0.0 or higher (for development)

## License

MIT License - see the [LICENSE](../../LICENSE) file for details.

## Contributing

This is part of the Direct Method Library demo project. See the main repository for contribution guidelines.