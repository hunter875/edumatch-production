package com.edumatch.scholarship.service;

import com.edumatch.scholarship.exception.ConflictException;
import com.edumatch.scholarship.model.IdempotencyRecord;
import com.edumatch.scholarship.repository.IdempotencyRecordRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public <T> T execute(
            String idempotencyKey,
            String userIdentifier,
            String endpoint,
            Object requestBody,
            Class<T> responseType,
            Supplier<T> command
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return command.get();
        }

        String normalizedKey = idempotencyKey.trim();
        String requestHash = hashRequest(requestBody);

        return idempotencyRecordRepository
                .findByUserIdentifierAndEndpointAndIdempotencyKey(userIdentifier, endpoint, normalizedKey)
                .map(record -> replay(record, requestHash, responseType))
                .orElseGet(() -> executeAndStore(
                        normalizedKey,
                        userIdentifier,
                        endpoint,
                        requestHash,
                        responseType,
                        command
                ));
    }

    private <T> T executeAndStore(
            String idempotencyKey,
            String userIdentifier,
            String endpoint,
            String requestHash,
            Class<T> responseType,
            Supplier<T> command
    ) {
        T response = command.get();

        IdempotencyRecord record = new IdempotencyRecord();
        record.setIdempotencyKey(idempotencyKey);
        record.setUserIdentifier(userIdentifier);
        record.setEndpoint(endpoint);
        record.setRequestHash(requestHash);
        record.setStatusCode(HttpStatus.CREATED.value());
        record.setResponseBody(writeJson(response));
        idempotencyRecordRepository.save(record);

        return response;
    }

    private <T> T replay(IdempotencyRecord record, String requestHash, Class<T> responseType) {
        if (!record.getRequestHash().equals(requestHash)) {
            throw new ConflictException("Idempotency-Key was already used with a different request body.");
        }

        try {
            return objectMapper.readValue(record.getResponseBody(), responseType);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to replay idempotent response.");
        }
    }

    private String hashRequest(Object requestBody) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(writeJson(requestBody).getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte value : bytes) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available.");
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize idempotency payload.");
        }
    }
}
