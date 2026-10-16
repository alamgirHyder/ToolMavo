package com.toolmavo;

import jakarta.persistence.*;
import java.math.*;
import java.time.Instant;
import java.util.UUID;

@Entity
class Invoice {
  @Id UUID id;

  @Column(nullable = false, length = 150)
  String client;

  @Column(nullable = false, length = 200)
  String email;

  @Column(nullable = false, length = 500)
  String description;

  @Column(nullable = false, precision = 12, scale = 2)
  BigDecimal quantity;

  @Column(nullable = false, precision = 14, scale = 2)
  BigDecimal rate;

  @Column(nullable = false, length = 3)
  String currency;

  @Column(nullable = false, precision = 20, scale = 2)
  BigDecimal total;

  @Column(nullable = false)
  Instant createdAt;

  protected Invoice() {}

  Invoice(ApiController.InvoiceRequest r) {
    id = UUID.randomUUID();
    client = r.client().trim();
    email = r.email().trim();
    description = r.description().trim();
    quantity = r.quantity();
    rate = r.rate();
    currency = r.currency();
    total = quantity.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    createdAt = Instant.now();
  }
}
