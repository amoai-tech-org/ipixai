# ZenUML Diagrams Reference

ZenUML is an alternative syntax for sequence diagrams that uses programming-language-style constructs (if/else, while, try/catch). Use when you prefer code-like syntax over standard sequence diagram notation.

## Basic Syntax

```mermaid
zenuml
    Alice -> Bob: Hello
    Bob -> Alice: Hi there
```

**Note:** ZenUML is an external module. It requires `@mermaid-js/mermaid-zenuml` to be registered.

## Participants

### Implicit Declaration
Participants are created when first referenced:
```mermaid
zenuml
    Alice -> Bob: message
```

### Aliases
```mermaid
zenuml
    @Actor Alice
    @Database db as "User Database"
    Alice -> db: query
```

### Annotators
Special participant types:
- `@Actor` - Person/user
- `@Database` - Database
- `@Entity` - System entity
- `@Boundary` - System boundary
- `@Control` - Controller
- `@Queue` - Message queue

## Message Types

### Synchronous (Blocking)
```mermaid
zenuml
    Client -> Server: request()
```

### Asynchronous (Non-blocking)
```mermaid
zenuml
    Publisher => Subscriber: notify()
```

### Creation Messages
```mermaid
zenuml
    Factory -> new Product: create()
```

### Return Messages
```mermaid
zenuml
    Client -> Server.getData() {
        return data
    }
```

Three return patterns:
```mermaid
zenuml
    A -> B: explicit reply
    B --> A: dashed reply
    @return "return value"
```

## Nesting

Sync and creation messages support nesting with braces:
```mermaid
zenuml
    Client -> Server.login(user, pass) {
        Server -> Database.verify(user, pass) {
            return verified
        }
        return token
    }
```

## Control Flow

### Conditionals (Alt/Else)
```mermaid
zenuml
    Client -> Server.authenticate(credentials) {
        if (valid) {
            return token
        } else if (expired) {
            return "refresh required"
        } else {
            return error
        }
    }
```

### Loops
Four loop keywords available:
```mermaid
zenuml
    while (hasMore) {
        Client -> Server: fetchPage()
    }
```

```mermaid
zenuml
    for (each item in list) {
        Processor -> Queue: enqueue(item)
    }
```

Also: `forEach`, `foreach`, `loop`

### Optional (Opt)
```mermaid
zenuml
    opt {
        Client -> Cache: checkCache()
    }
    Client -> Server: fetchData()
```

### Parallel (Par)
```mermaid
zenuml
    par {
        Service -> DatabaseA: queryA()
        Service -> DatabaseB: queryB()
        Service -> CacheService: warmCache()
    }
```

### Exception Handling
```mermaid
zenuml
    try {
        Client -> PaymentService: charge(amount) {
            PaymentService -> Gateway: process()
        }
    } catch (PaymentError) {
        PaymentService -> Client: refund()
    } finally {
        PaymentService -> AuditLog: record()
    }
```

## Comments

```mermaid
zenuml
    // This is a comment (supports Markdown)
    Alice -> Bob: hello
```

## ZenUML vs Standard Sequence Diagrams

| Feature | ZenUML | Standard |
|---------|--------|----------|
| Syntax style | Code-like (braces, if/else) | Diagram-like (alt/end, loop/end) |
| Nesting | Curly braces `{}` | Keyword blocks |
| Conditionals | `if/else if/else` | `alt/else/end` |
| Loops | `while/for/forEach` | `loop/end` |
| Error handling | `try/catch/finally` | `break` (limited) |
| Async | `=>` operator | `--)` arrow |
| Creation | `new` keyword | `create` keyword |

**Choose ZenUML when:**
- Your team thinks in code structures
- You need try/catch/finally patterns
- Complex nesting is easier to read with braces

**Choose standard when:**
- Broader tool compatibility is needed
- You want more styling/theming options
- Simpler diagrams without deep nesting

## Integration

ZenUML requires explicit registration as an external diagram:

```html
<script type="module">
  import mermaid from 'mermaid';
  import zenuml from '@mermaid-js/mermaid-zenuml';
  await mermaid.registerExternalDiagrams([zenuml]);
</script>
```

## Tips

1. **Use nesting** to show method call depth clearly
2. **Prefer `if/else`** over multiple separate diagrams for conditional flows
3. **Use `try/catch`** for error-handling flows - unique to ZenUML
4. **Use `par`** to explicitly show concurrent operations
5. **Add comments** with `//` to annotate complex flows
6. **Keep nesting shallow** - more than 3-4 levels becomes hard to read

## Reference

- [Official Documentation](https://mermaid.js.org/syntax/zenuml.html)
