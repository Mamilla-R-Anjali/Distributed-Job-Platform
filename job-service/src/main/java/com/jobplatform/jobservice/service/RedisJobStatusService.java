
package com.jobplatform.jobservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class RedisJobStatusService {

    private static final Logger logger =
            LoggerFactory.getLogger(RedisJobStatusService.class);

    private static final String KEY_PREFIX = "job:status:";

    private final StringRedisTemplate redisTemplate;

    public RedisJobStatusService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void setStatus(Long jobId, String status) {
        try {
            redisTemplate.opsForValue().set(
                    KEY_PREFIX + jobId,
                    status
            );

            logger.info(
                    "Redis cache updated: jobId={}, status={}",
                    jobId,
                    status
            );

        } catch (Exception e) {
            logger.warn(
                    "Unable to update Redis for jobId={}: {}",
                    jobId,
                    e.getMessage()
            );
        }
    }

    public String getStatus(Long jobId) {
        try {
            return redisTemplate.opsForValue().get(
                    KEY_PREFIX + jobId
            );

        } catch (Exception e) {
            logger.warn(
                    "Unable to read Redis for jobId={}: {}",
                    jobId,
                    e.getMessage()
            );

            return null;
        }
    }

    public void deleteStatus(Long jobId) {
        try {
            redisTemplate.delete(KEY_PREFIX + jobId);

        } catch (Exception e) {
            logger.warn(
                    "Unable to delete Redis cache for jobId={}: {}",
                    jobId,
                    e.getMessage()
            );
        }
    }
}
