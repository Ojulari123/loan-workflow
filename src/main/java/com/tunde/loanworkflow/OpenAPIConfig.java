package com.tunde.loanworkflow;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenAPIConfig {

    @Bean
    public OpenAPI loanApplicationAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Loan Application API")
                        .description("REST API for managing loan applications, applicants, and payments")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Tunde")
                                .email("support@loanapp.com")));
    }
}