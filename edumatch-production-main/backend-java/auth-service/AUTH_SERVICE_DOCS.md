# Auth Service - Tài Liệu Chi Tiết

## 📋 Tổng Quan

**Service**: Auth Service  
**Port**: 8081  
**Framework**: Spring Boot 3.x + Java 17  
**Database**: MySQL 8.0  
**Purpose**: Quản lý authentication, authorization, và user management

---

## 🏗️ Kiến Trúc

```
auth-service/
├── src/main/java/com/example/jwt/example/
│   ├── JwtMyExsampleApplication.java          # Main application
│   ├── config/                                 # Configuration classes
│   ├── controller/                             # REST API endpoints
│   ├── dto/                                    # Data Transfer Objects
│   ├── exception/                              # Exception handlers
│   ├── model/                                  # JPA entities
│   ├── repository/                             # Database repositories
│   ├── security/                               # Security config & JWT
│   └── service/                                # Business logic
├── src/main/resources/
│   ├── application.properties                  # Default config
│   ├── application-docker.properties           # Docker config
│   ├── application-mysql.properties            # MySQL config
│   ├── application-test.properties             # Test config
│   └── db/migration/                           # Flyway migrations
│       ├── V2__add_organization_and_user_fields.sql
│       ├── V3__add_matching_fields_to_users.sql
│       ├── V3__add_user_profile_fields.sql
│       └── V4__create_organization_requests_table.sql
└── src/test/java/                              # Unit tests
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('STUDENT', 'EMPLOYER', 'ADMIN'),
    
    -- Organization fields (V2 migration)
    organization_id BIGINT,
    organization_name VARCHAR(255),
    organization_type VARCHAR(100),
    
    -- Matching fields (V3 migration)
    skills TEXT,
    interests TEXT,
    education_level VARCHAR(100),
    field_of_study VARCHAR(255),
    gpa DECIMAL(3,2),
    
    -- Profile fields (V3 migration)
    phone VARCHAR(20),
    address TEXT,
    bio TEXT,
    avatar_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_organization (organization_id)
);
```

### Organization Requests Table (V4)
```sql
CREATE TABLE organization_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(100),
    website_url VARCHAR(500),
    description TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_user (user_id)
);
```

---

## 🔌 API Endpoints

### Authentication

#### POST /api/auth/register
**Description**: Đăng ký user mới

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "Password123!",
  "fullName": "Nguyen Van A",
  "role": "STUDENT"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "email": "student@example.com",
  "fullName": "Nguyen Van A",
  "role": "STUDENT",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2025-01-20T10:00:00Z"
}
```

**Validation**:
- Email: Valid format, unique
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
- Role: Must be STUDENT, EMPLOYER, or ADMIN
- FullName: Required, max 255 chars

---

#### POST /api/auth/login
**Description**: Đăng nhập

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "Password123!"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "id": 1,
  "email": "student@example.com",
  "role": "STUDENT",
  "fullName": "Nguyen Van A"
}
```

**Error Responses**:
- 401 Unauthorized: Invalid credentials
- 404 Not Found: User not found

---

#### GET /api/auth/me
**Description**: Lấy thông tin user hiện tại

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "email": "student@example.com",
  "fullName": "Nguyen Van A",
  "role": "STUDENT",
  "phone": "0123456789",
  "bio": "Computer Science student",
  "skills": ["Java", "Python", "React"],
  "interests": ["AI", "Machine Learning"],
  "educationLevel": "UNDERGRADUATE",
  "fieldOfStudy": "Computer Science",
  "gpa": 3.8,
  "avatarUrl": "https://example.com/avatar.jpg",
  "organizationId": null,
  "organizationName": null,
  "createdAt": "2025-01-20T10:00:00Z"
}
```

---

### User Management

#### PUT /api/auth/profile
**Description**: Cập nhật profile user

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "fullName": "Nguyen Van A",
  "phone": "0123456789",
  "address": "123 Main St, HCMC",
  "bio": "Passionate CS student",
  "avatarUrl": "https://example.com/avatar.jpg",
  "skills": ["Java", "Python", "React"],
  "interests": ["AI", "ML", "Web Dev"],
  "educationLevel": "UNDERGRADUATE",
  "fieldOfStudy": "Computer Science",
  "gpa": 3.8
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "email": "student@example.com",
  "fullName": "Nguyen Van A",
  "phone": "0123456789",
  "bio": "Passionate CS student",
  "skills": ["Java", "Python", "React"],
  "updatedAt": "2025-01-20T11:00:00Z"
}
```

---

#### GET /api/auth/users
**Description**: Lấy danh sách users (Admin only)

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (default: 0): Page number
- `size` (default: 20): Page size
- `role` (optional): Filter by role
- `search` (optional): Search by email/name

**Response** (200 OK):
```json
{
  "content": [
    {
      "id": 1,
      "email": "student@example.com",
      "fullName": "Nguyen Van A",
      "role": "STUDENT",
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ],
  "totalElements": 100,
  "totalPages": 5,
  "currentPage": 0,
  "pageSize": 20
}
```

---

#### DELETE /api/auth/users/{id}
**Description**: Xóa user (Admin only)

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (204 No Content)

---

### Organization Requests

#### POST /api/auth/organization-requests
**Description**: Gửi yêu cầu tạo organization (Employer)

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "organizationName": "ABC Company",
  "organizationType": "COMPANY",
  "websiteUrl": "https://abccompany.com",
  "description": "Leading tech company in Vietnam"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "userId": 5,
  "organizationName": "ABC Company",
  "organizationType": "COMPANY",
  "websiteUrl": "https://abccompany.com",
  "description": "Leading tech company in Vietnam",
  "status": "PENDING",
  "createdAt": "2025-01-20T10:00:00Z"
}
```

---

#### GET /api/auth/organization-requests
**Description**: Lấy danh sách organization requests (Admin)

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `status` (optional): PENDING, APPROVED, REJECTED

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "userId": 5,
    "userEmail": "employer@example.com",
    "organizationName": "ABC Company",
    "status": "PENDING",
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```

---

#### PUT /api/auth/organization-requests/{id}/approve
**Description**: Approve organization request (Admin)

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "adminNotes": "Verified organization details"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "status": "APPROVED",
  "adminNotes": "Verified organization details",
  "updatedAt": "2025-01-20T11:00:00Z"
}
```

---

#### PUT /api/auth/organization-requests/{id}/reject
**Description**: Reject organization request (Admin)

**Request Body**:
```json
{
  "adminNotes": "Invalid documentation provided"
}
```

**Response** (200 OK)

---

## 🔐 Security

### JWT Token Structure

```json
{
  "sub": "student@example.com",
  "userId": 1,
  "role": "STUDENT",
  "iat": 1674214800,
  "exp": 1674301200
}
```

**Token Expiration**: 24 hours  
**Algorithm**: HS256  
**Secret**: Stored in environment variable `JWT_SECRET`

### Password Security

- **Hashing**: BCrypt with strength 10
- **Validation**: Min 8 chars, must contain:
  - 1 uppercase letter
  - 1 lowercase letter
  - 1 number
  - 1 special character (optional)

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **STUDENT** | - Update own profile<br>- View scholarships<br>- Apply for scholarships<br>- View own applications |
| **EMPLOYER** | - Update own profile<br>- Create scholarships<br>- Manage own scholarships<br>- Review applications<br>- Request organization verification |
| **ADMIN** | - All STUDENT + EMPLOYER permissions<br>- Manage all users<br>- Approve/reject organizations<br>- View system analytics<br>- Delete users |

---

## 🔧 Configuration

### Environment Variables

```properties
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/auth_db
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=86400000  # 24 hours in milliseconds

# RabbitMQ
SPRING_RABBITMQ_HOST=localhost
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest

# Server
SERVER_PORT=8081
```

### Application Profiles

#### application.properties (Default)
```properties
spring.application.name=auth-service
server.port=8081
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
```

#### application-docker.properties
```properties
spring.datasource.url=jdbc:mysql://mysql:3306/auth_db
spring.rabbitmq.host=rabbitmq
```

#### application-test.properties
```properties
spring.datasource.url=jdbc:mysql://localhost:3307/auth_db_test
spring.jpa.hibernate.ddl-auto=create-drop
spring.flyway.enabled=false
```

---

## 🧪 Testing

### Unit Tests

**Location**: `src/test/java/com/example/jwt/example/`

**Run Tests**:
```bash
cd backend-java/auth-service
mvn clean test
```

**Test Coverage**:
- Controller tests: REST API endpoints
- Service tests: Business logic
- Repository tests: Database operations
- Security tests: JWT validation

### Integration Tests

**Environment**: docker-compose.test.yml

**Run**:
```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d auth-service mysql rabbitmq

# Wait for services
sleep 30

# Test endpoints
curl http://localhost:8081/actuator/health
newman run tests/postman/EduMatch-API-Tests.json

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

---

## 🚀 Deployment

### Local Development

```bash
cd backend-java/auth-service

# Build
mvn clean package -DskipTests

# Run
java -jar target/auth-service-0.0.1-SNAPSHOT.jar
```

### Docker

```bash
# Build image
docker build -t auth-service:latest ./backend-java/auth-service

# Run container
docker run -p 8081:8081 \
  -e SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/auth_db \
  -e JWT_SECRET=your-secret \
  auth-service:latest
```

### Azure Container Apps

**Deployment**: Automatic via GitHub Actions (`.github/workflows/deploy-backend.yml`)

**Environment Variables** (Azure Key Vault):
- `mysql-host`
- `mysql-username`
- `mysql-password`
- `jwt-secret`
- `servicebus-connection-string`

**URL**: `https://auth-service-app.azurecontainerapps.io`

---

## 📊 Monitoring & Health Checks

### Health Check Endpoint

**GET** `/actuator/health`

**Response**:
```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "MySQL",
        "validationQuery": "isValid()"
      }
    },
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": 250GB,
        "free": 100GB,
        "threshold": 10MB
      }
    },
    "rabbit": {
      "status": "UP",
      "details": {
        "version": "3.12.0"
      }
    }
  }
}
```

### Metrics

**GET** `/actuator/metrics`

Available metrics:
- `http.server.requests` - Request count & duration
- `jvm.memory.used` - Memory usage
- `jdbc.connections.active` - DB connections
- `system.cpu.usage` - CPU usage

---

## 🔄 Database Migrations

### Flyway Migrations

**Location**: `src/main/resources/db/migration/`

**Naming Convention**: `V{version}__{description}.sql`

**Existing Migrations**:
1. `V1__initial_schema.sql` - Base users table
2. `V2__add_organization_and_user_fields.sql` - Organization support
3. `V3__add_matching_fields_to_users.sql` - Matching algorithm fields
4. `V3__add_user_profile_fields.sql` - Extended profile fields
5. `V4__create_organization_requests_table.sql` - Organization requests

**Apply Migrations**:
```bash
# Automatic on application startup
# Or manual:
mvn flyway:migrate
```

**Rollback** (manual):
```sql
-- Check migration history
SELECT * FROM flyway_schema_history;

-- Manual rollback (no auto-rollback in Flyway)
-- Drop tables or revert changes manually
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. JWT Token Invalid
```
Error: JWT signature does not match locally computed signature
```
**Solution**: Check JWT_SECRET matches between services

#### 2. Database Connection Failed
```
Error: Communications link failure
```
**Solution**: 
- Check MySQL is running
- Verify connection string
- Check firewall rules

#### 3. User Already Exists
```
Error: Duplicate entry 'email@example.com' for key 'users.email'
```
**Solution**: Email must be unique, use different email

#### 4. Unauthorized Access
```
Error: 403 Forbidden
```
**Solution**: Check user role has required permissions

---

## 📈 Performance Optimization

### Database Indexes

```sql
-- Email lookup (login)
CREATE INDEX idx_email ON users(email);

-- Role-based queries
CREATE INDEX idx_role ON users(role);

-- Organization queries
CREATE INDEX idx_organization ON users(organization_id);
```

### Connection Pool

```properties
# HikariCP configuration
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

### Caching

```java
// Cache user details for 5 minutes
@Cacheable(value = "users", key = "#userId")
public User getUserById(Long userId) {
    return userRepository.findById(userId).orElseThrow();
}
```

---

## 🔗 Integration với Services Khác

### RabbitMQ Events

**Published Events**:
- `user.registered` - Khi user đăng ký mới
- `user.updated` - Khi user cập nhật profile
- `organization.approved` - Khi organization được approve

**Event Structure**:
```json
{
  "eventType": "user.registered",
  "userId": 1,
  "email": "student@example.com",
  "role": "STUDENT",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

### External Dependencies

- **Scholarship Service**: Validates JWT tokens from Auth Service
- **Chat Service**: Uses user info for messaging
- **Matching Service**: Uses user profile data for matching algorithm

---

## 📚 References

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [JWT.io](https://jwt.io/)
- [Flyway Migrations](https://flywaydb.org/)
- [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/)

---

**Last Updated**: January 2025  
**Service Version**: 1.0.0  
**Maintained By**: EduMatch Backend Team
