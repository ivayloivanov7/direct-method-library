# Direct Method Library - API Documentation

This directory contains API documentation for all platform implementations of the Direct Method Library.

## Overview

The Direct Method Library provides consistent MQTT client functionality across multiple programming languages and platforms. Each implementation follows the same core API design while respecting language-specific conventions and best practices.

## Core API Components

### DirectMethodMqttClient Class

The main class providing MQTT client functionality across all platforms.

#### Constructor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `brokerHost` | string | - | MQTT broker hostname or IP address |
| `brokerPort` | integer | 1883 | MQTT broker port |
| `topic` | string | - | Topic to subscribe and publish to |
| `clientId` | string | auto-generated | Unique client identifier |

#### Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | Promise/Task/None | Connect to MQTT broker |
| `disconnect()` | Promise/Task/None | Disconnect from MQTT broker |
| `publish(message)` | Promise/Task/None | Publish message to topic |
| `subscribe()` | Promise/Task/None | Subscribe to topic |

#### Properties/Getters

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | boolean | Current connection status |
| `topic` | string | Configured topic |
| `brokerInfo` | object | Broker connection details |
| `clientId` | string | Client identifier |

#### Message Handling

| Platform | Method/Event | Signature |
|----------|--------------|-----------|
| **Python** | `on_message_received(callback)` | `callback(topic: str, message: str)` |
| **Node.js** | `onMessageReceived(callback)` | `callback(topic: string, message: string)` |
| **.NET** | `MessageReceived` event | `MessageReceivedHandler(string topic, string message)` |

## Platform-Specific Documentation

### Python API

See [Python SDK Documentation](../packages/sdk-python/README.md)

Key features:
- Type hints for better IDE support
- Context manager support (`with` statement)
- Threading-safe operations
- Comprehensive error handling

```python
from direct_method_mqtt import DirectMethodMqttClient

with DirectMethodMqttClient("localhost", 1883, "test/topic") as client:
    client.on_message_received(lambda topic, msg: print(f"{topic}: {msg}"))
    client.subscribe()
    client.publish("Hello Python!")
```

### Node.js/TypeScript API

See [Node.js SDK Documentation](../packages/sdk-node/README.md)

Key features:
- Full TypeScript support
- Promise-based async API
- Modern ES6+ syntax
- Comprehensive type definitions

```typescript
import { DirectMethodMqttClient } from 'direct-method-mqtt-client';

const client = new DirectMethodMqttClient('localhost', 1883, 'test/topic');
client.onMessageReceived((topic, message) => console.log(`${topic}: ${message}`));

await client.connect();
await client.subscribe();
await client.publish('Hello TypeScript!');
```

### .NET API

See [.NET SDK Documentation](../packages/sdk-dotnet/README.md)

Key features:
- Async/await pattern throughout
- Event-based message handling
- IDisposable implementation
- Nullable reference types (C# 8+)

```csharp
using DirectMethod.Mqtt.Client;

using var client = new DirectMethodMqttClient("localhost", 1883, "test/topic");
client.MessageReceived += (topic, message) => Console.WriteLine($"{topic}: {message}");

await client.ConnectAsync();
await client.SubscribeAsync();
await client.PublishAsync("Hello C#!");
```

## Error Handling

All implementations provide consistent error handling patterns:

### Connection Errors
- **Python**: `ConnectionError`
- **Node.js**: `Error` with descriptive message
- **.NET**: `InvalidOperationException`

### Runtime Errors
- **Python**: `RuntimeError`
- **Node.js**: `Error`
- **.NET**: `InvalidOperationException`

### Parameter Validation
- **Python**: `ValueError`
- **Node.js**: `Error`
- **.NET**: `ArgumentException`

## Threading and Concurrency

### Python
- Thread-safe for concurrent operations
- Message callbacks execute in MQTT client thread
- Use threading locks when modifying shared state in callbacks

### Node.js
- Single-threaded event loop model
- All operations are async/await compatible
- Message callbacks execute in main event loop

### .NET
- Fully async with CancellationToken support
- Event handlers execute on background threads
- Use proper synchronization for shared state

## Configuration Options

### Connection Timeouts

| Platform | Method | Default |
|----------|--------|---------|
| **Python** | `connect(timeout=5.0)` | 5 seconds |
| **Node.js** | Built-in timeout | 5 seconds |
| **.NET** | `ConnectAsync(cancellationToken)` | 5 seconds |

### Quality of Service (QoS)

All implementations use QoS 0 (At most once) for simplicity in this demo project.

### Keep Alive

| Platform | Setting | Value |
|----------|---------|-------|
| **Python** | `keepalive` | 60 seconds |
| **Node.js** | `reconnectPeriod` | 1 second |
| **.NET** | Default | 60 seconds |

## Usage Patterns

### Basic Usage Pattern

1. Create client instance with broker details
2. Set up message handler (optional)
3. Connect to broker
4. Subscribe to topic (optional)
5. Publish/receive messages
6. Disconnect when done

### Error Handling Pattern

```python
# Python
try:
    client.connect()
    client.publish("message")
except ConnectionError:
    # Handle connection issues
except RuntimeError:
    # Handle MQTT operation failures
```

```typescript
// TypeScript
try {
    await client.connect();
    await client.publish("message");
} catch (error) {
    // Handle any connection or operation errors
    console.error('MQTT error:', error.message);
}
```

```csharp
// C#
try
{
    await client.ConnectAsync();
    await client.PublishAsync("message");
}
catch (InvalidOperationException ex)
{
    // Handle connection or operation errors
    Console.WriteLine($"MQTT error: {ex.Message}");
}
```

### Resource Management

| Platform | Recommendation |
|----------|----------------|
| **Python** | Use context manager or manual disconnect |
| **Node.js** | Always call disconnect() in finally block |
| **.NET** | Use `using` statement or call Dispose() |

## Performance Considerations

- All implementations are designed for demonstration purposes
- Production use should consider connection pooling
- Message throughput depends on broker configuration
- Error retry logic should be implemented for production scenarios

## Version Compatibility

The API remains consistent across versions within major releases. Breaking changes will only occur in major version updates.

For specific version information, see:
- [Python Changelog](../packages/sdk-python/README.md)
- [Node.js Changelog](../packages/sdk-node/README.md)
- [.NET Changelog](../packages/sdk-dotnet/README.md)