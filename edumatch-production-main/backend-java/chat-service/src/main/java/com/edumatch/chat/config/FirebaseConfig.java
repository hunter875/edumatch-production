package com.edumatch.chat.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;

@Configuration
@Slf4j
public class FirebaseConfig {

    // Lấy đường dẫn file JSON từ application.properties
    @Value("${app.firebase.sdk-path}")
    private String firebaseSdkPath;

    private final ResourceLoader resourceLoader;

    // Spring tự động tiêm ResourceLoader
    public FirebaseConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @Bean
    @ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true", matchIfMissing = true)
    public FirebaseApp initializeFirebase() throws IOException {
        log.info("🔥 [Firebase] ============================================");
        log.info("🔥 [Firebase] Bắt đầu khởi tạo Firebase Admin SDK...");
        log.info("🔥 [Firebase] SDK Path: {}", firebaseSdkPath);
        
        try {
            // Check if already initialized
            if (!FirebaseApp.getApps().isEmpty()) {
                log.info("✅ [Firebase] Firebase App đã được khởi tạo trước đó. Số apps: {}", FirebaseApp.getApps().size());
                log.info("🔥 [Firebase] ============================================");
                return FirebaseApp.getInstance();
            }
            
            // Load resource
            Resource resource = resourceLoader.getResource(firebaseSdkPath);
            
            if (!resource.exists()) {
                log.error("❌ [Firebase] File KHÔNG TỒN TẠI: {}", firebaseSdkPath);
                log.error("❌ [Firebase] Kiểm tra file có trong: backend-java/chat-service/src/main/resources/");
                log.error("❌ [Firebase] ============================================");
                throw new FileNotFoundException("Firebase credentials file not found: " + firebaseSdkPath);
            }
            
            log.info("✅ [Firebase] File tồn tại: {}", resource.getFilename());
            log.info("📁 [Firebase] File URI: {}", resource.getURI());
            log.info("📦 [Firebase] File size: {} bytes", resource.contentLength());

            try (InputStream serviceAccount = resource.getInputStream()) {
                log.info("✅ [Firebase] InputStream opened successfully");
                
                GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccount);
                log.info("✅ [Firebase] Google Credentials loaded");
                
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();
                
                log.info("✅ [Firebase] FirebaseOptions built");
                
                FirebaseApp app = FirebaseApp.initializeApp(options);
                log.info("✅ [Firebase] FirebaseApp initialized: {}", app.getName());
                log.info("🎉 [Firebase] Firebase Admin SDK khởi tạo THÀNH CÔNG!");
                log.info("🔥 [Firebase] ============================================");
                
                return app;
            }

        } catch (FileNotFoundException e) {
            log.error("❌ [Firebase] ============================================");
            log.error("❌ [Firebase] FILE NOT FOUND ERROR");
            log.error("❌ [Firebase] Path: {}", firebaseSdkPath);
            log.error("❌ [Firebase] Hướng dẫn fix:");
            log.error("❌ [Firebase]   1. Tải Firebase Admin SDK JSON key từ Firebase Console");
            log.error("❌ [Firebase]   2. Đặt file vào: backend-java/chat-service/src/main/resources/");
            log.error("❌ [Firebase]   3. Đảm bảo tên file: firebase-adminsdk-key.json");
            log.error("❌ [Firebase]   4. Rebuild Docker image nếu dùng Docker");
            log.error("❌ [Firebase] ============================================");
            log.error("❌ [Firebase] Stack trace: ", e);
            throw e;
            
        } catch (IOException e) {
            log.error("❌ [Firebase] ============================================");
            log.error("❌ [Firebase] IO ERROR khi đọc Firebase credentials");
            log.error("❌ [Firebase] Path: {}", firebaseSdkPath);
            log.error("❌ [Firebase] Error: {}", e.getMessage());
            log.error("❌ [Firebase] Kiểm tra:");
            log.error("❌ [Firebase]   - File có đúng định dạng JSON?");
            log.error("❌ [Firebase]   - File có bị corrupt?");
            log.error("❌ [Firebase]   - Có quyền đọc file?");
            log.error("❌ [Firebase] ============================================");
            log.error("❌ [Firebase] Stack trace: ", e);
            throw e;
            
        } catch (Exception e) {
            log.error("❌ [Firebase] ============================================");
            log.error("❌ [Firebase] UNKNOWN ERROR khi khởi tạo Firebase");
            log.error("❌ [Firebase] Error type: {}", e.getClass().getName());
            log.error("❌ [Firebase] Error: {}", e.getMessage());
            log.error("❌ [Firebase] ============================================");
            log.error("❌ [Firebase] Stack trace: ", e);
            throw e;
        }
    }
}
