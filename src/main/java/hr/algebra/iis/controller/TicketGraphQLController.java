package hr.algebra.iis.controller;

import hr.algebra.iis.model.Ticket;
import hr.algebra.iis.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class TicketGraphQLController {

    private final TicketService ticketService;

    @QueryMapping
    public List<Ticket> tickets() {
        return ticketService.findAll();
    }

    @QueryMapping
    public Ticket ticket(@Argument Long id) {
        return ticketService.findById(id);
    }

    @PreAuthorize("hasRole('FULL_ACCESS')")
    @MutationMapping
    public Ticket createTicket(@Argument String subject, @Argument String description,
                               @Argument String status, @Argument String priority,
                               @Argument String requesterEmail) {
        return ticketService.create(subject, description, status, priority, requesterEmail);
    }

    @PreAuthorize("hasRole('FULL_ACCESS')")
    @MutationMapping
    public Ticket updateTicket(@Argument Long id, @Argument String subject, @Argument String description,
                               @Argument String status, @Argument String priority,
                               @Argument String requesterEmail) {
        return ticketService.update(id, Ticket.builder()
                .subject(subject).description(description)
                .status(status).priority(priority)
                .requesterEmail(requesterEmail).build());
    }

    @PreAuthorize("hasRole('FULL_ACCESS')")
    @MutationMapping
    public Boolean deleteTicket(@Argument Long id) {
        ticketService.deleteById(id);
        return true;
    }
}
