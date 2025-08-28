# Project Overview: Microservices Architecture & Implementation

## 1. Microservices Architecture
- The project is designed using a microservices approach, separating concerns into distinct services for authentication (`auth-service`) and messaging (`message-service`).
- Each service is independently deployable, scalable, and communicates via Kafka for event-driven messaging.
- Centralized monitoring and logging are implemented using Prometheus and Grafana.

## 2. Docker Implementation
- Dockerfiles for each service (`Dockerfile.auth`, `Dockerfile.messenger`) ensure consistent environments and easy deployment.
- `docker-compose.yml` orchestrates all services, including MongoDB, monitoring tools, and Nginx for reverse proxy and SSL termination.
- MongoDB is initialized with replica sets and secure keyfiles.
- Monitoring stack includes Prometheus (metrics), Grafana (dashboards), and Node Exporter.

**Cluster & Broker Details:**
- The system uses Docker Compose to orchestrate a multi-container environment for microservices, databases, brokers, and monitoring.
- **Zookeeper Cluster:**
  - 3 containers: `zookeeper-1`, `zookeeper-2`, `zookeeper-3`
  - Ports: 2181, 2182, 2183 (each node exposes a unique port)
  - Each Zookeeper node is configured for clustering and health checks.
  - Used as a dependency for Kafka brokers.
- **Kafka Cluster:**
  - 3 brokers: `kafka-1`, `kafka-2`, `kafka-3`
  - Ports:
    - `kafka-1`: 9092 (host), 29092 (internal)
    - `kafka-2`: 9093 (host), 29093 (internal)
    - `kafka-3`: 9094 (host), 29094 (internal)
  - Each broker depends on all Zookeeper nodes (ensuring healthy cluster before startup).
  - Replication factor: 3, partitions: 128, min in-sync replicas: 2
  - Brokers are configured for high availability and data durability.
- **Kafka UI:**
  - Container: `kafka-ui`
  - Port: 8080
  - Provides a web interface for managing Kafka clusters.
  - Depends on all Kafka brokers.
- **Redis Cluster:**
  - 6 nodes: 3 masters (`redis-node-1`, `redis-node-2`, `redis-node-3`) and 3 replicas
  - Ports: 7001-7006
  - Each node is configured for clustering, persistence, and memory management.
- **Other Services:**
  - MongoDB (with replica set and keyfile authentication)
  - Auth and Message microservices (see previous overview for details)
  - Monitoring stack: Prometheus, Grafana, Node Exporter
  - Nginx for SSL termination and reverse proxy
- **Dependencies:**
  - Kafka brokers depend on Zookeeper cluster
  - Kafka UI depends on Kafka brokers
  - Microservices depend on Kafka, MongoDB, Redis
  - Monitoring tools scrape metrics from all major containers
- **Networks & Volumes:**
  - All containers are connected via `app-network` for internal communication
  - Persistent volumes for data durability (Zookeeper, Kafka, Redis, MongoDB)
- **Healthchecks & Resource Limits:**
  - Each major container has health checks for reliability
  - Resource limits and reservations are set for memory and CPU to ensure stability

## 3. Folder & File Structure Overview

### Root Level
- `docker-compose.yml`: Defines all containers, networks, and volumes for the project.
- `overview.md`: This document.
- `package.json`: Project-level dependencies and scripts.

---

### docker/
- `Dockerfile.auth`: Builds the authentication service container.
- `Dockerfile.messenger`: Builds the messaging service container.

### mongo/
- `init-replica.js`: Initializes MongoDB replica set for high availability.
- `keyfile/mongo-keyfile`: Secure keyfile for MongoDB internal authentication.

### monitoring/
#### grafana/
- `dashboards/`: Pre-configured dashboards for Kafka, MongoDB, Node Exporter, Redis.
- `provisioning/dashboards.yml`: Automates dashboard setup.
- `provisioning/datasources.yml`: Configures data sources for Grafana.

#### prometheus/
- `prometheus.yml`: Main configuration for Prometheus scraping targets.
- `rules/alerts.yml`: Alerting rules for system health and events.

### nginx/
- `nginx.conf`: Reverse proxy configuration, SSL, routing to services.
- `ssl/cert.pem`, `ssl/key.pem`: SSL certificate and key for HTTPS.

### secrets/
- `jwt_secret.txt`: Secret key for JWT authentication.

---

## 4. Services

### services/auth-service/
- `package.json`: Service dependencies and scripts.
- `server.js`: Entry point, sets up Express server and routes.
- `src/app.js`: Main app configuration, middleware setup.
- `src/config/config.js`: Environment variables and service configuration.
- `src/controllers/user.controller.js`: Handles user registration, login, profile, and business logic.
- `src/cron/inactiveUserBlocker.js`: Scheduled job to block inactive users.
- `src/db/db.js`: MongoDB connection and setup.
- `src/kafka/producer.js`: Kafka producer for publishing authentication events.
- `src/middlewares/auth.middleware.js`: JWT authentication middleware.
- `src/middlewares/user.validations.js`: Input validation for user-related endpoints.
- `src/models/deviceTracker.model.js`: Mongoose model for tracking user devices.
- `src/models/phone.model.js`: Mongoose model for phone verification.
- `src/models/user.model.js`: Mongoose model for user data.
- `src/routes/auth.routes.js`: API routes for authentication (login, register, etc.).
- `src/routes/gitHubOauth.routes.js`: Routes for GitHub OAuth integration.
- `src/routes/otp.routes.js`: Routes for OTP-based authentication.
- `src/routes/user.routes.js`: User profile and management routes.
- `src/services/redis.service.js`: Redis client for caching and session management.
- `src/services/twillio.service.js`: Twilio integration for SMS/OTP.
- `src/services/user.service.js`: Business logic for user operations.
- `src/utils/Authpassport.js`: Passport.js strategies for authentication.
- `src/utils/utils.js`: Utility functions (e.g., token generation, hashing).

---

### services/message-service/
- `package.json`: Service dependencies and scripts.
- `server.js`: Entry point, sets up Express server and routes.
- `src/app.js`: Main app configuration, middleware setup.
- `src/config/config.js`: Environment variables and service configuration.
- `src/controllers/bookmark.controller.js`: Handles message bookmarking.
- `src/controllers/message.controller.js`: Core message send/receive logic.
- `src/controllers/reactionemoji.controller.js`: Handles emoji reactions to messages.
- `src/controllers/reciept.controller.js`: Message receipt and read status.
- `src/controllers/search.controller.js`: Search functionality for messages.
- `src/db/db.js`: MongoDB connection and setup.
- `src/kafka/kafka.consumer.js`: Kafka consumer for processing incoming events.
- `src/middlewares/auth.middleware.js`: JWT authentication middleware.
- `src/models/counter.model.mjs`: Model for message counters (e.g., unread count).
- `src/models/message.model.js`: Mongoose model for messages.
- `src/models/reaction.model.js`: Model for reactions to messages.
- `src/models/receiveMessage.model.js`: Model for received messages.
- `src/models/star.model.js`: Model for starred messages.
- `src/routes/message.routes.js`: API routes for messaging.
- `src/routes/reaction.routes.js`: Routes for message reactions.
- `src/routes/recipt.routes.js`: Routes for message receipts.
- `src/routes/search.routes.js`: Routes for message search.
- `src/routes/star.routes.js`: Routes for starring messages.
- `src/services/kafkaClient.mjs`: Kafka client setup for messaging.
- `src/services/messageConsumer.mjs`: Consumes and processes messages from Kafka.
- `src/services/messagePersistence.mjs`: Handles message storage and retrieval.
- `src/services/messageProducer.mjs`: Publishes messages to Kafka.
- `src/utils/ttl.js`: Utility for time-to-live (TTL) calculations.

---

## 5. Key Functionalities
- **Authentication**: Secure login, registration, OAuth, OTP, device tracking, and user management.
- **Messaging**: Real-time message delivery, reactions, bookmarks, receipts, search, and star features.
- **Event-Driven Communication**: Kafka used for inter-service communication and scalability.
- **Monitoring & Alerts**: Prometheus and Grafana for metrics, dashboards, and alerting.
- **Security**: JWT, SSL, Redis caching, MongoDB authentication, and secure secrets management.
- **Scalability**: Docker and microservices enable horizontal scaling and independent deployments.

---

## 6. Implementation Highlights
- Each file is modular, focusing on a single responsibility (controller, model, service, route, utility).
- All services are containerized for easy deployment and scaling.
- Monitoring and alerting are integrated for production readiness.
- Secure practices are followed for secrets, authentication, and inter-service communication.

---

This overview provides a comprehensive, point-by-point summary of the project structure, implementation, and key functionalities. You can share this directly with your CEO to demonstrate the depth and breadth of your work on this microservices-based system.
