package com.example.jwt.example.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.base-url:http://localhost:8081/uploads}")
    private String baseUrl;

    // Allowed magic bytes for image formats
    // JPEG: FF D8 FF
    // PNG:  89 50 4E 47 0D 0A 1A 0A
    // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] RIFF_MAGIC = {0x52, 0x49, 0x46, 0x46}; // "RIFF"
    private static final byte[] WEBP_MAGIC = {0x57, 0x45, 0x42, 0x50}; // "WEBP"

    // SVG is rejected because it can contain scripts (XSS) and is not a raster image
    private static final String SVG_MIME = "image/svg+xml";

    // Allowed image extensions derived from actual content
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".webp");

    // Max file size: 5 MB
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    /**
     * Read the first N bytes of the input stream and reset it.
     */
    private byte[] readMagicBytes(InputStream inputStream, int count) throws IOException {
        byte[] bytes = new byte[count];
        int bytesRead = inputStream.read(bytes, 0, count);
        if (bytesRead < count) {
            // File too small — won't match any valid magic
            byte[] actual = new byte[bytesRead];
            System.arraycopy(bytes, 0, actual, 0, bytesRead);
            return actual;
        }
        return bytes;
    }

    /**
     * Determine the real image format from magic bytes.
     * Returns extension with dot (e.g. ".jpg") or throws.
     */
    private String detectExtensionFromMagicBytes(byte[] header) {
        // JPEG
        if (header.length >= 3
                && header[0] == JPEG_MAGIC[0]
                && header[1] == JPEG_MAGIC[1]
                && header[2] == JPEG_MAGIC[2]) {
            return ".jpg";
        }
        // PNG
        if (header.length >= 8
                && header[0] == PNG_MAGIC[0]
                && header[1] == PNG_MAGIC[1]
                && header[2] == PNG_MAGIC[2]
                && header[3] == PNG_MAGIC[3]
                && header[4] == PNG_MAGIC[4]
                && header[5] == PNG_MAGIC[5]
                && header[6] == PNG_MAGIC[6]
                && header[7] == PNG_MAGIC[7]) {
            return ".png";
        }
        // WebP: RIFF????WEBP (12 bytes)
        if (header.length >= 12
                && header[0] == RIFF_MAGIC[0]
                && header[1] == RIFF_MAGIC[1]
                && header[2] == RIFF_MAGIC[2]
                && header[3] == RIFF_MAGIC[3]
                && header[8] == WEBP_MAGIC[0]
                && header[9] == WEBP_MAGIC[1]
                && header[10] == WEBP_MAGIC[2]
                && header[11] == WEBP_MAGIC[3]) {
            return ".webp";
        }
        throw new IllegalArgumentException(
            "Unsupported image format. Only JPEG, PNG, and WebP are accepted."
        );
    }

    /**
     * Re-encode the uploaded image to strip any embedded metadata/malware.
     * Returns the re-encoded bytes along with the detected format.
     */
    private ReEncodedImage reEncodeImage(InputStream inputStream, String detectedExt) throws IOException {
        BufferedImage image = ImageIO.read(inputStream);
        if (image == null) {
            throw new IllegalArgumentException("Cannot decode image — file may be corrupted or not a valid image.");
        }
        // Determine format for ImageIO
        String formatName = detectedExt.startsWith(".") ? detectedExt.substring(1) : detectedExt;
        if ("jpg".equals(formatName) || "jpeg".equals(formatName)) formatName = "JPEG";
        else if ("png".equals(formatName)) formatName = "PNG";
        else if ("webp".equals(formatName)) formatName = "WEBP";

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        if (!ImageIO.write(image, formatName, baos)) {
            throw new IllegalArgumentException("Failed to re-encode image as " + formatName);
        }
        return new ReEncodedImage(baos.toByteArray(), formatName.toLowerCase());
    }

    private static class ReEncodedImage {
        final byte[] bytes;
        final String format; // "jpeg", "png", "webp"
        ReEncodedImage(byte[] bytes, String format) {
            this.bytes = bytes;
            this.format = format;
        }
    }

    /**
     * Upload avatar file and return URL.
     * Security:
     * - Validates via magic bytes (not client-supplied Content-Type)
     * - Rejects SVG
     * - Re-encodes the image to strip metadata
     * - Sets extension based on actual content
     */
    public String uploadAvatar(MultipartFile file, Long userId) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Validate file size (max 5MB)
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size must be less than 5MB");
        }

        // Reject SVG explicitly (can contain scripts)
        String clientContentType = file.getContentType();
        if (SVG_MIME.equals(clientContentType)) {
            throw new IllegalArgumentException("SVG files are not accepted for security reasons.");
        }

        // Read magic bytes to detect real format
        byte[] magicHeader;
        try (InputStream is = file.getInputStream()) {
            magicHeader = readMagicBytes(is, 12);
        }

        // Detect real extension from magic bytes (ignores client Content-Type)
        String extension = detectExtensionFromMagicBytes(magicHeader);

        // Re-encode the image to strip metadata
        ReEncodedImage reEncoded;
        try (InputStream is = file.getInputStream()) {
            reEncoded = reEncodeImage(is, extension);
        }

        // Create upload directory if not exists
        Path uploadPath = Paths.get(uploadDir, "avatars");
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate filename with verified extension (ignores original filename extension)
        String filename = "avatar_" + userId + "_" + UUID.randomUUID().toString() + extension;

        // Save re-encoded file
        Path filePath = uploadPath.resolve(filename);
        Files.copy(new ByteArrayInputStream(reEncoded.bytes), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Return URL
        String fileUrl = baseUrl + "/avatars/" + filename;
        log.info("Avatar uploaded successfully (format={}, size={}): {}",
                reEncoded.format, reEncoded.bytes.length, fileUrl);
        return fileUrl;
    }

    /**
     * Delete avatar file
     */
    public void deleteAvatar(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isEmpty()) {
            return;
        }

        try {
            // Extract filename from URL
            String filename = avatarUrl.substring(avatarUrl.lastIndexOf("/") + 1);
            Path filePath = Paths.get(uploadDir, "avatars", filename);

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Avatar deleted: {}", filename);
            }
        } catch (IOException e) {
            log.error("Error deleting avatar: {}", e.getMessage());
        }
    }
}

