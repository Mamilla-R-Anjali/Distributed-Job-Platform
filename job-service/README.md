# Distributed Job Platform

A containerized distributed job processing platform built with Spring Boot, React, Kafka, Redis, MySQL, Docker, and Nginx.

The platform allows users to submit jobs through a web interface. Jobs are persisted by the Job Service, published to Kafka, processed asynchronously by distributed worker instances, and updated with their final execution status and result.

---

## Architecture

```text
Browser
   |
   v
React Frontend
   |
   v
Nginx
   |
   v
API Gateway
   |
   v
Job Service
   |
   +----------> MySQL
   |
   +----------> Redis
   |
   v
Kafka
   |
   +----------+----------+
   |          |          |
   v          v          v
Worker 1   Worker 2   Worker 3
   |          |          |
   +----------+----------+
              |
              v
         Job Service
              |
              v
       MySQL + Redis
              |
              v
       React Dashboard