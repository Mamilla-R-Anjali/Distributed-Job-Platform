package com.jobplatform.jobservice.controller;

import com.jobplatform.jobservice.model.Job;
import com.jobplatform.jobservice.service.JobService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = {
        "http://localhost:5174",
        "http://127.0.0.1:5174"
})
public class JobController {

    private final JobService jobService;

    /*
     * Docker provides WORKER_API_KEY.
     *
     * Explicitly prefer the environment variable so the
     * internal worker authentication key is the same value
     * used by worker-service.
     */
    @Value("${WORKER_API_KEY:${worker.api.key}}")
    private String workerApiKey;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping
    public ResponseEntity<Job> createJob(
            @RequestBody Job job) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(jobService.createJob(job));
    }

    @GetMapping
    public ResponseEntity<List<Job>> getAllJobs() {

        return ResponseEntity.ok(
                jobService.getAllJobs()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getJobById(
            @PathVariable Long id) {

        Job job = jobService.getJobById(id);

        if (job == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error", "Job not found",
                            "jobId", id
                    ));
        }

        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateJobStatus(
            @PathVariable Long id,
            @RequestHeader(
                    value = "X-Worker-Key",
                    required = false
            )
            String providedWorkerKey,
            @RequestBody Map<String, String> request) {

        /*
         * Internal worker authentication.
         *
         * Only worker-service, which knows the configured
         * internal worker API key, can update job status.
         */
        if (providedWorkerKey == null
                || !providedWorkerKey.equals(workerApiKey)) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error",
                            "Worker authentication failed"
                    ));
        }

        String status = request.get("status");
        String result = request.get("result");

        if (status == null || status.isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "error",
                            "Status is required"
                    ));
        }

        if (!status.equalsIgnoreCase("PENDING")
                && !status.equalsIgnoreCase("PROCESSING")
                && !status.equalsIgnoreCase("COMPLETED")
                && !status.equalsIgnoreCase("FAILED")) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "error",
                            "Invalid status",
                            "allowedStatuses",
                            List.of(
                                    "PENDING",
                                    "PROCESSING",
                                    "COMPLETED",
                                    "FAILED"
                            )
                    ));
        }

        Job updatedJob =
                jobService.updateJobStatus(
                        id,
                        status,
                        result
                );

        if (updatedJob == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error",
                            "Job not found",
                            "jobId",
                            id
                    ));
        }

        return ResponseEntity.ok(updatedJob);
    }
}