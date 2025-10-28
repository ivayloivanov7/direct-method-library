# Direct Method Library

A multi-platform MQTT client library showcasing best practices for organizing code, tests, and documentation across different programming languages and environments.

## Overview

This is a demo project that presents a multi-platform library structure, demonstrating how to structure a multi-language project effectively. The library includes implementations in:

- **Python** - Using `paho-mqtt`
- **TypeScript/Node.js** - Using `mqtt`
- **C#/.NET** - Using `MQTTnet`

## Project Structure

This monorepo contains separate packages for each language/platform:

```
packages/
├── sdk-python/          # Python implementation
├── sdk-node/            # Node.js/TypeScript implementation
└── sdk-dotnet/          # .NET implementation
```

## Quick Start

### Python
```bash
cd packages/sdk-python
pip install .
```

### Node.js
```bash
cd packages/sdk-node
npm install
```

### .NET
```bash
cd packages/sdk-dotnet
dotnet build
```

## Usage

Each implementation provides a `DirectMethodMqttClient` class that can:
- Connect to an MQTT broker
- Subscribe to a topic
- Publish messages to the same topic

### Python Example
```python
from direct_method_mqtt import DirectMethodMqttClient

client = DirectMethodMqttClient("localhost", 1883, "test/topic")
client.connect()
client.subscribe()
client.publish("Hello from Python!")
```

### Node.js Example
```typescript
import { DirectMethodMqttClient } from '@direct-method/mqtt-client';

const client = new DirectMethodMqttClient('localhost', 1883, 'test/topic');
await client.connect();
await client.subscribe();
await client.publish('Hello from Node.js!');
```

### .NET Example
```csharp
using DirectMethod.Mqtt.Client;

var client = new DirectMethodMqttClient("localhost", 1883, "test/topic");
await client.ConnectAsync();
await client.SubscribeAsync();
await client.PublishAsync("Hello from .NET!");
```

## Package Information

- **Python**: `direct-method-mqtt-python`
- **Node.js**: `@direct-method/mqtt-client`
- **C#/.NET**: `DirectMethod.Mqtt.Client`

## Development

This project uses GitHub Actions for CI/CD, testing, and release automation. Releases are automatically published to:
- PyPI (Python)
- npm (Node.js)
- NuGet (.NET)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

This is a demo project showcasing multi-platform library structure and CI/CD practices.