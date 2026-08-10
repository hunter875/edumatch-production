package com.example.jwt.example.config;

import com.example.jwt.example.model.Role;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.RoleRepository;
import com.example.jwt.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class InitialDataLoader implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin.enabled:false}")
    private boolean adminBootstrapEnabled;

    @Value("${app.bootstrap.admin.username:}")
    private String adminUsername;

    @Value("${app.bootstrap.admin.email:}")
    private String adminEmail;

    @Value("${app.bootstrap.admin.password:}")
    private String adminPassword;

    private static final int MIN_PASSWORD_LENGTH = 12;

    @Override
    public void run(String... args) {

        // Roles are always safe to seed — no credentials involved
        createRoleIfNotFound("ROLE_USER", "Regular user role");
        createRoleIfNotFound("ROLE_EMPLOYER", "Employer role");
        createRoleIfNotFound("ROLE_ADMIN", "Administrator role");

        // Admin bootstrap is DISABLED by default.
        // In production, set APP_BOOTSTRAP_ADMIN_ENABLED=true and provide
        // APP_BOOTSTRAP_ADMIN_USERNAME, APP_BOOTSTRAP_ADMIN_EMAIL, APP_BOOTSTRAP_ADMIN_PASSWORD.
        if (!adminBootstrapEnabled) {
            log.info("Admin bootstrap is disabled (app.bootstrap.admin.enabled=false). Skipping admin creation.");
            return;
        }

        // Validate required properties
        if (adminUsername == null || adminUsername.isBlank()) {
            log.error("Admin bootstrap enabled but app.bootstrap.admin.username is empty — refusing to create admin.");
            return;
        }
        if (adminEmail == null || adminEmail.isBlank()) {
            log.error("Admin bootstrap enabled but app.bootstrap.admin.email is empty — refusing to create admin.");
            return;
        }
        if (adminPassword == null || adminPassword.isBlank()) {
            log.error("Admin bootstrap enabled but app.bootstrap.admin.password is empty — refusing to create admin.");
            return;
        }
        if (adminPassword.length() < MIN_PASSWORD_LENGTH) {
            log.error("Admin bootstrap password is too short (min {} chars) — refusing to create admin.", MIN_PASSWORD_LENGTH);
            return;
        }

        // Skip if admin already exists (by username or email)
        if (userRepository.findByUsername(adminUsername).isPresent()
                || userRepository.findByEmail(adminEmail).isPresent()) {
            log.info("Admin user already exists. Skipping bootstrap creation.");
            return;
        }

        Role adminRole = roleRepository.findByName("ROLE_ADMIN").orElseThrow();

        Set<Role> roles = new HashSet<>();
        roles.add(adminRole);
        // Admin gets ONLY ROLE_ADMIN by default, not ROLE_USER or ROLE_EMPLOYER

        User adminUser = User.builder()
                .username(adminUsername)
                .password(passwordEncoder.encode(adminPassword))
                .email(adminEmail)
                .firstName("Admin")
                .lastName("User")
                .roles(roles)
                .enabled(true)
                .status("ACTIVE")
                .subscriptionType("FREE")
                .build();

        userRepository.save(adminUser);
        log.info("Admin user '{}' created via bootstrap.", adminUsername);
        // Never log the password
    }

    private void createRoleIfNotFound(String name, String description) {
        if (roleRepository.findByName(name).isEmpty()) {
            Role role = Role.builder()
                    .name(name)
                    .description(description)
                    .build();
            roleRepository.save(role);
            log.info("Role created: {}", name);
        }
    }
}
