package com.toolmavo;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface ContactRepository extends JpaRepository<ContactMessage, UUID> {}

interface InvoiceRepository extends JpaRepository<Invoice, UUID> {}
