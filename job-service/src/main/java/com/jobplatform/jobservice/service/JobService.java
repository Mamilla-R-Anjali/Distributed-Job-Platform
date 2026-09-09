package com.jobplatform.jobservice.service;

import com.jobplatform.jobservice.kafka.JobKafkaProducer;
import com.jobplatform.jobservice.model.Job;
import com.jobplatform.jobservice.repository.JobRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final JobKafkaProducer jobKafkaProducer;
    private final RedisJobStatusService redisJobStatusService;

    public JobService(
            JobRepository jobRepository,
            JobKafkaProducer jobKafkaProducer,
            RedisJobStatusService redisJobStatusService) {

        this.jobRepository = jobRepository;
        this.jobKafkaProducer = jobKafkaProducer;
        this.redisJobStatusService = redisJobStatusService;
    }

    public Job createJob(Job job) {

        if (job.getStatus() == null || job.getStatus().isBlank()) {
            job.setStatus("PENDING");
        }

        if (job.getCreatedAt() == null) {
            job.setCreatedAt(
                    LocalDateTime.now(
                            ZoneId.of("Asia/Kolkata")
                    )
            );
        }

        Job savedJob = jobRepository.save(job);

        // Store initial status in Redis
        redisJobStatusService.setStatus(
                savedJob.getId(),
                savedJob.getStatus()
        );

        // Send job to Kafka
        jobKafkaProducer.sendJob(savedJob);

        return savedJob;
    }

    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    public Job getJobById(Long id) {

        Job job = jobRepository.findById(id).orElse(null);

        if (job == null) {
            return null;
        }

        // Redis is a fast cache; MySQL remains the source of truth.
        String cachedStatus =
                redisJobStatusService.getStatus(id);

        if (cachedStatus != null && !cachedStatus.isBlank()) {
            job.setStatus(cachedStatus);
        }

        return job;
    }

    public Job updateJobStatus(
            Long id,
            String status,
            String result) {

        Job job = jobRepository.findById(id).orElse(null);

        if (job == null) {
            return null;
        }

        job.setStatus(status);
        job.setResult(result);

        if ("COMPLETED".equalsIgnoreCase(status)
                || "FAILED".equalsIgnoreCase(status)) {

            job.setCompletedAt(
                    LocalDateTime.now(
                            ZoneId.of("Asia/Kolkata")
                    )
            );
        }

        Job updatedJob = jobRepository.save(job);

        // Keep Redis synchronized with the database.
        redisJobStatusService.setStatus(
                updatedJob.getId(),
                updatedJob.getStatus()
        );

        return updatedJob;
    }
}