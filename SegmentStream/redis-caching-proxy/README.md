# Preface

Upon a brief research, I decided to use **Node** for implementing the proxy service.

### But isn't Node single threaded?

Yeah, and at first glance I thought that it would be too slow, under-utilizing CPU cores due to its single-threadness, so I
started looking into C++ or Go... but then, after a more thorough thinking, I abandoned those attempts — realizing that
while a C++ implementation would've surely provided a better performance, it is not at all because of multithreading...

Actually, had I implemented it in C++, it would've been processing requests in pretty much the same way as Node! Likely even
utilizing the same library for doing I/O (**libuv**) or similar stuff (_libev, libevents_).

### Here's my line of reasoning:

- **Our service must be I/O bound** — i.e. most of the time it waits for an I/O to happen. And it does not perform any
  CPU-intensive processing in JS callbacks. All it does is touching the LRU cache and issuing more I/O. And that cache thing
  is _small peanuts_ in terms of CPU utilization — it's literally just a couple of hashtable / linked list operations that
  cannot take more than a few hundred CPU cycles.
  
- **The actual I/O heavylifting is already parallel**, managed by the OS kernel — no need to worry about that. We can have
  tons of parallel I/O operations (e.g. pending requests to a backing Redis instance) — and as long as our JS callbacks don't
  block the CPU, we can perfectly remain single-threaded and that shouldn't ever become a bottleneck.

- **If we actually processed requests using threads**, we would have had to worry about a shared memory for the LRU cache,
  implement thread-safety (locks), and that would've surely made it even slower than a single-threaded version,
  because with locks it would've essentially become **just as sequential** (plus an extra synchronization overhead)...
  So a multi-threaded LRU lookup was a silly idea from the start!
  
- Surely, coding the proxy using bare C++ (either via libuv/libevent/libev or by doing it as an Nginx module) would've
  given the best possible theoretical performance as there wouldn't be any Node/V8-related overhead. But if
  the CPU isn't really a bottleneck, then a C++ reimplementation might give little to no performance benefit! If I had
  more time for the test assignment, I would've probably tried to produce an additional C++ impl and a performance
  benchmark to compare against Node — all for the sake of science. But for now let's stick to Node...

# Architecture Overview

The project is split into two distinct modules (the **service** and the **test** suite) — **each a separate containerized
Node app** with only minimal dependencies.

## 1. The Service

![Service](https://user-images.githubusercontent.com/1707/75506056-e4dc8580-59ed-11ea-8c50-c5152e929eac.png)

### 1.1. Expects external configuration

All the configuration (e.g. ports, hostnames, cache behavior) is done via **environment variables**, and they are
mandatory — there are no implicit default values. Like those Python guys say, _explicit is better than implicit_.
So one must pass them down to the container externally.

### 1.2. Exposes an HTTP API

Listens on an HTTP port using the built-in `http` module.

- There is no fancy load-balancing — it is supposed to be added/configured externally if reasonable.
- It expects incoming **GET requests** with URLs like `/key` (url-encoded).
- Other requests result in **HTTP 405** (Method Not Allowed)

### 1.3. Manages A Caching Layer

Requested keys first get looked up in an **LRU cache**:

- It is a hybrid **hashtable + doubly linked list** implementation
- There is **no persistence**, it is all **in-memory**
- There is also a **limit on keys** — newer keys evict older keys
- There is a **limit on TTL** (time-to-live) for cache entries. If an entry expires, we update it.

### 1.4. Connects To Redis

If there isn't a cache entry (or an entry has been expired) **we ask Redis for a value** for that key:

- We use a popular [`node-redis`](https://github.com/NodeRedis/node-redis) connector
- **If a key isn't there — we respond with HTTP 404** (Not Found)
- If Redis responds with an error — we respond with **HTTP 502** (Bad Gateway)
- **If Redis is unavailable — we respond with HTTP 503** (Unavailable)

  - There are auto-reconnects (provided by `node-redis`, we only set the "always reconnect" policy)
  - **We don't await until Redis** is back online when processing GET requests!
  - We don't try to be "smart" in error handling, we act as a transparent proxy (**error in, error out**)
  - If we tried to await until Redis is back, it would've eventually led to a huge amount of hanging requests (memleak)

### 1.5. Handles Unexpected Errors

- Unexpected errors when processing HTTP requests result in **HTTP 500** (Internal Server Error)
- Unexpected errors in other contexts trigger **exiting the process** (with code 1)

  - You are supposed to run the service using an orchestrator taking care of its restarts...
  - The service itself is "dumb" (intentionally) when it comes to error handling — it is better when externalized

## 2. Tests

![Tests](https://user-images.githubusercontent.com/1707/75506600-8b755600-59ef-11ea-8dba-43b4ab78a639.png)

### 2.2. Tests Implemented

- Responds with 404 on an unknown key
- Implements cached GET for keys
- Implements cache eviction (max keys)
- Implements global expiry (TTL) for keys
- **Processes concurrent requests in parallel** (this one is particularly interesting)

# What The Code Does

### Logic Files

- **`service/src`**
    - **`main.js`** the entry point + HTTP server + Redis connector
    - **`LRU.js`** a higher-order function that adds caching to an arbitrary `async get (key)` function
    - **`util.js`** a tiny boilerplate for configuration and error handling

- **`test/src`**
    - **`test.js`** test scenarios
    - **`util.js`** a boilerplate for running tests (env, API connectors, misc functions)

### Configuration Files

- **`Makefile`** exposes `make test` (launches tests) and `make dev` (launches with hot code reload)

- **`service`**
  - **`Dockerfile`** container desc (production)
  - **`Dockerfile.dev`** container desc (development) — adds hot code reload

- **`test`**
  - **`.env`** env variables for docker-compose (hostnames, ports, cache behavior)
  - **`docker-compose.yml`** brings all together (tests + service + redis)
  - **`docker-compose.dev.yml`** dev mode overrides (adds hot code reload to `tests` and `service`)
  - **`Dockerfile`** container desc (tests runner)

# Algorithmic Complexity of The Cache Operations

In our implementation, there are two data structures involved in basic operations. Here's the analysis:

|            | **DoublyLinkedList** | **Map<K, V>** (average) | **Map<K, V>** (worst) |
|------------|------------------|---------------------|---------------------|
| **Insert New** | prepend: O(1)    | insert: O(1)        | insert: O(N)        |
| **Move Up**    | relink: O(1)     | _not involved_      | _not involved_      |
| **Evict Old**  | pop: O(1)        | delete: O(1)        | delete: O(N)        |

It is safe to say that our cache operates in **O(1)** time on **average**. Because we use a hashtable, there
could be collisions, so the worst case is **O(N)**. But if a cache entry already exists ("move up" operation), the worst case is **O(1)** — because no hashmap involved in that case.

# How To Run

### 1. Tests

```
make test
```

### 2. Development Mode (Hot Code Reload)

```
make dev
```

### 3. Proxy

In production, the proxy is supposed to be configured and run using an orchestrator. But if you need to run it manually,
there is a `service/Dockerfile`. Assuming you know your backing Redis instance host (put your actual values there):

```sh
cd service
docker image build -t redis-caching-proxy:1.0 .
docker container run \
    -e REDIS_HOST=1.2.3.4 \
    -e PROXY_PORT=8080 \
    -e CACHE_MAX_KEYS=500 \
    -e CACHE_MAX_TTL_MS=10000 \
    -p 8080:8080 --init --rm --name redis-caching-proxy redis-caching-proxy:1.0
```

# How Long You Spent On Each Part of The Project

All that containerized backend stuff is quite a new area to me, so most of the time I have spent on an extensive research —
reading articles, trying to figure out better ways _to Docker_ and so on. All in all, it took 2 days with just a
few sleeping hours.

I cannot give a breakdown of that time to "parts", because it wasn't at all sequential — I had been constantly re-iterating
everything from the overall structure to the finest bits and pieces, trying new ideas and so on. And the last 5 hours
I've spent on writing this doc, trying to put everything together!

# Requirements I Did Not Implement

- I haven't implemented tests for all the features — in particular when it comes to Redis errors and Redis unavailability. Simulating a Redis downtime from inside of a test runner container won't be easy — one cannot simply start and stop containers from sibling containers — it would require a _Docker in Docker_ and messing with sharing a socket...

- Oh, that thing from **Bonus requirements**. Maybe if I had 3-4 more days, I could have implemented it as well...

  > Clients interface to the Redis proxy through a subset of the Redis protocol (as opposed to using the HTTP protocol).
    The proxy should implement the parts of the Redis protocol that is required to meet this specification.

