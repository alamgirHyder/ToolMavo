package com.toolmavo;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:toolmavo;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
      "spring.datasource.driver-class-name=org.h2.Driver",
      "spring.datasource.username=sa",
      "spring.datasource.password="
    })
@AutoConfigureMockMvc
class ApiTest {
  @Autowired MockMvc mvc;
  @Autowired InvoiceRepository invoices;
  @Autowired ContactRepository contacts;

  @Test
  void savesInvoiceWithServerCalculatedTotal() throws Exception {
    long before = invoices.count();
    mvc.perform(
            post("/api/invoices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"client":"Test Client","email":"client@example.com","description":"Design","quantity":2.5,"rate":10.25,"currency":"USD"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("total").value(25.63))
        .andExpect(jsonPath("id").isNotEmpty());
    assertEquals(before + 1, invoices.count());
  }

  @Test
  void rejectsInvalidInvoice() throws Exception {
    long before = invoices.count();
    mvc.perform(
            post("/api/invoices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"client":"","email":"bad","description":"Design","quantity":-1,"rate":10,"currency":"XXX"}
                    """))
        .andExpect(status().isBadRequest());
    assertEquals(before, invoices.count());
  }

  @Test
  void savesContact() throws Exception {
    long before = contacts.count();
    mvc.perform(
            post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"name":"Test","email":"test@example.com","message":"Please add more tools."}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("id").isNotEmpty());
    assertEquals(before + 1, contacts.count());
  }

  @Test
  void rejectsInvalidContact() throws Exception {
    mvc.perform(
            post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"name":"Test","email":"bad","message":"short"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("message").exists());
  }

  @Test
  void rejectsClientSuppliedTotal() throws Exception {
    mvc.perform(
            post("/api/invoices").contentType(MediaType.APPLICATION_JSON).content("{\"total\":1}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void healthRequiresDatabase() throws Exception {
    mvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("status").value("UP"));
  }

  @Test
  void noPublicReadAccessToPrivateRecords() throws Exception {
    mvc.perform(get("/api/invoices")).andExpect(status().isMethodNotAllowed());
    mvc.perform(get("/api/contact")).andExpect(status().isMethodNotAllowed());
  }
}
