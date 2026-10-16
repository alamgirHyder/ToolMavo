package com.toolmavo;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
class ContactMessage {
  @Id UUID id;

  @Column(nullable = false, length = 150)
  String name;

  @Column(nullable = false, length = 200)
  String email;

  @Column(nullable = false, length = 5000)
  String message;

  @Column(nullable = false)
  Instant createdAt;

  protected ContactMessage() {}

  ContactMessage(ApiController.ContactRequest request) {
    id = UUID.randomUUID();
    name = request.name().trim();
    email = request.email().trim();
    message = request.message().trim();
    createdAt = Instant.now();
  }
}
