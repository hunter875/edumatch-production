package com.edumatch.chat.dto;

import lombok.Data;

// DTO này khớp với DTO mà Auth-Service (File 5)
// và Scholarship-Service (File 1) sử dụng
@Data
public class UserDetailDto {
    private Long id;
    private String username;
    // (Chúng ta không cần organizationId trong service này)
}