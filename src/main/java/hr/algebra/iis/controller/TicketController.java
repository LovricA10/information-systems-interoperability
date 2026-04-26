package hr.algebra.iis.controller;

import hr.algebra.iis.model.Ticket;
import hr.algebra.iis.service.TicketService;
import hr.algebra.iis.service.XmlValidationService;
import hr.algebra.iis.service.ZendeskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:8080")
public class TicketController {

    private final TicketService ticketService;
    private final XmlValidationService xmlValidationService;
    private final ZendeskService zendeskService;

    @GetMapping
    public ResponseEntity<List<Ticket>> getAll() {
        return ResponseEntity.ok(ticketService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.findById(id));
    }

    @PostMapping(value = "/xml", consumes = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<?> createFromXml(@RequestBody String xmlContent) {
        try {
            Ticket ticket = ticketService.saveFromXml(xmlContent);
            return ResponseEntity.ok(ticket);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/json", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createFromJson(@RequestBody String jsonContent) {
        try {
            Ticket ticket = ticketService.saveFromJson(jsonContent);
            return ResponseEntity.ok(ticket);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Ticket ticket) {
        return ResponseEntity.ok(ticketService.update(id, ticket));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ticketService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/validate-xml")
    public ResponseEntity<Map<String, Object>> validateXml() {
        List<String> messages = xmlValidationService.validateGeneratedXml();
        return ResponseEntity.ok(Map.of(
                "messages", messages,
                "valid", messages.stream().noneMatch(m -> m.contains("GREŠKA"))
        ));
    }

    @GetMapping("/zendesk")
    public ResponseEntity<?> getZendeskTickets() {
        return ResponseEntity.ok(zendeskService.getTickets());
    }
}