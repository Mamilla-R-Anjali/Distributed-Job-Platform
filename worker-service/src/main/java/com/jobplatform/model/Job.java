package com.jobplatform.workerservice.model;

import java.time.LocalDateTime;

public class Job {

    private Long id;

    private String name;

    private String status;

    private LocalDateTime createdAt;

    private Long durationMs;

    public Job() {
    }

    public Job(Long id, String name, String status, LocalDateTime createdAt, Long durationMs) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.createdAt = createdAt;
        this.durationMs = durationMs;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(Long durationMs) {
        this.durationMs = durationMs;
    }

    @Override
    public String toString() {
        return "Job{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", status='" + status + '\'' +
                ", createdAt=" + createdAt +
                ", durationMs=" + durationMs +
                '}';
    }
}