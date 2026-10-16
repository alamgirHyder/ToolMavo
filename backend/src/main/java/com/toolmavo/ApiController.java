package com.toolmavo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class ApiController {
  private final ContactRepository contacts;
  private final InvoiceRepository invoices;
  private final JdbcTemplate jdbc;

  ApiController(ContactRepository c, InvoiceRepository i, JdbcTemplate j) {
    contacts = c;
    invoices = i;
    jdbc = j;
  }

  record ContactRequest(
      @NotBlank @Size(max = 150) String name,
      @NotBlank @Email @Size(max = 200) String email,
      @NotBlank @Size(min = 10, max = 5000) String message) {}

  record InvoiceRequest(
      @NotBlank @Size(max = 150) String client,
      @NotBlank @Email @Size(max = 200) String email,
      @NotBlank @Size(max = 500) String description,
      @NotNull @DecimalMin("0.01") @DecimalMax("100000") @Digits(integer = 6, fraction = 2)
          BigDecimal quantity,
      @NotNull @DecimalMin("0") @DecimalMax("1000000") @Digits(integer = 7, fraction = 2)
          BigDecimal rate,
      @NotNull @Pattern(regexp = "USD|EUR|GBP|PKR") String currency) {}

  record InvoiceReceipt(
      UUID id,
      String client,
      String description,
      BigDecimal quantity,
      BigDecimal rate,
      String currency,
      BigDecimal total,
      Instant createdAt) {}

  @GetMapping("/health")
  Map<String, String> health() {
    jdbc.queryForObject("SELECT 1", Integer.class);
    return Map.of("status", "UP", "database", "PostgreSQL");
  }

  @PostMapping("/contact")
  @ResponseStatus(HttpStatus.CREATED)
  Map<String, Object> contact(@Valid @RequestBody ContactRequest r) {
    ContactMessage m = contacts.save(new ContactMessage(r));
    return Map.of("id", m.id, "createdAt", m.createdAt);
  }

  @PostMapping("/invoices")
  @ResponseStatus(HttpStatus.CREATED)
  InvoiceReceipt invoice(@Valid @RequestBody InvoiceRequest r) {
    Invoice i = invoices.save(new Invoice(r));
    return new InvoiceReceipt(
        i.id, i.client, i.description, i.quantity, i.rate, i.currency, i.total, i.createdAt);
  }
}
