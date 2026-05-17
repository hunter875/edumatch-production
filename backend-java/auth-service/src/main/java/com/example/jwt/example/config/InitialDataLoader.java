package com.example.jwt.example.config;

import com.example.jwt.example.model.Role;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.RoleRepository;
import com.example.jwt.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class InitialDataLoader implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        // Create roles if they don't exist
        createRoleIfNotFound("ROLE_USER", "Regular user role");
        createRoleIfNotFound("ROLE_EMPLOYER", "Employer role");
        createRoleIfNotFound("ROLE_ADMIN", "Administrator role");

        // === FIX DUPLICATE EMAIL BUG ===
        if (userRepository.findByUsername("admin").isEmpty() &&
                userRepository.findByEmail("admin@example.com").isEmpty()) {

            Role adminRole    = roleRepository.findByName("ROLE_ADMIN").orElseThrow();
            Role userRole     = roleRepository.findByName("ROLE_USER").orElseThrow();
            Role employerRole = roleRepository.findByName("ROLE_EMPLOYER").orElseThrow();

            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            roles.add(userRole);
            roles.add(employerRole);

            User adminUser = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .email("admin@example.com")
                    .firstName("Admin")
                    .lastName("User")
                    .roles(roles)
                    .enabled(true)
                    .status("ACTIVE")
                    .subscriptionType("FREE")
                    .build();

            userRepository.save(adminUser);
            System.out.println("✔ Admin user created.");
        } else {
            System.out.println("✔ Admin user already exists. Skipping creation.");
        }
    }

    private void createRoleIfNotFound(String name, String description) {
        if (roleRepository.findByName(name).isEmpty()) {
            Role role = Role.builder()
                    .name(name)
                    .description(description)
                    .build();
            roleRepository.save(role);
            System.out.println("✔ Role created: " + name);
        }
    }
}
