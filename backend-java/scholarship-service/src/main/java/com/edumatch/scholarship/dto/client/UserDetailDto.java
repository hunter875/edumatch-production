package com.edumatch.scholarship.dto.client;

import lombok.Data;

// DTO đơn giản để hứng dữ liệu trả về từ Auth-Service
@Data
public class UserDetailDto {
    private Long id;
    private String username;
    //cần 2 trường này từ Auth-Service
    private Long organizationId;
}
